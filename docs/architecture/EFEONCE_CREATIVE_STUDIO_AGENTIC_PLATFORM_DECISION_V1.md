# ADR — Efeonce Globe: Creative Studio agentic peer con paridad UI + MCP

> **Tipo:** Architecture Decision Record (ecosistema / plataforma hermana)
> **Especificación canónica:** [Efeonce Creative Studio — Agentic Platform Architecture V1](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
> **Principio heredado/adaptado:** [Greenhouse Full API Parity Decision V1](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
> **Regla ADR:** `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Architecture Decision 2026-07-11 — la capacidad creativa nace agentic y fuera de Greenhouse

- **Status:** `Accepted / implementation started` — el repositorio, el proyecto GCP y el **primer datastore durable** de Globe (Cloud SQL `globe-pg`, `TASK-1465` deployed + live-verified) existen; el modelo de datos rico de tenencia, la habilitación de clientes y el gasto comercial siguen gateados. Ver Delta 2026-07-21.
- **Date:** 2026-07-11
- **Owner:** Efeonce Creative Technology / Product
- **Scope:** plataforma independiente para producir, revisar y operar imágenes, video, audio y, cuando corresponda, 3D. Incluye interfaz humana, agentes y MCP; no incluye el runtime de Greenhouse.
- **Reversibility:** `two-way-but-slow` — los proveedores, el modelo de rutas y la UI son intercambiables; separar la propiedad de assets, créditos, identidad operativa y contratos cross-platform no debe revertirse sin migración explícita.
- **Confidence:** `high` en la frontera y contrato agentic; `medium` en el orden exacto de proveedores/modelos y en pricing comercial, que requieren evidencia por modalidad.
- **Validated as of:** 2026-07-19 — repositorio privado y proyecto GCP inicial verificados, sin workloads ni secretos.
- **Program:** [EPIC-028](../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md).
- **Editorial support:** [PDR-014](../public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md) construye soporte científico y editorial; no modifica esta ADR ni autoriza implementación.

### Context

Efeonce necesita una capacidad propia para convertir dirección creativa en media reproducible: referencias, brief, secuencia, generación, revisión, variantes, audio, entrega y memoria de decisión. Los pilotos recientes demostraron dos verdades que un simple generador SaaS no resuelve:

1. El modelo correcto depende del **contrato de fidelidad** de la toma (set/practical/acción física/audio), no de un canal ni de una preferencia fija de proveedor.
2. Una generación técnicamente terminada no es un entregable: requiere criterio creativo, evidencia, control de gasto, versiones y una vía segura de corrección.

Greenhouse es el hub de experiencia y operaciones de cuenta; no debe absorber otro runtime pesado de media, workers largos, assets voluminosos, billing de proveedores ni el ritmo de producto de una capability creativa. La plataforma debe poder operar primero por el equipo Efeonce y, después, por clientes autorizados, sin reescribir su modelo de dominio.

### Decision

Se crea **Efeonce Globe** como nombre canónico de una **plataforma hermana de Efeonce**, agentic desde el primer contrato. **Creative Studio** es su descriptor funcional y Globe continúa siendo la vertical creativa interna de Efeonce; cualquier presentación pública como producto o submarca requiere una decisión de posicionamiento separada.

1. **Runtime y propiedad separados.** Creative Studio tendrá repositorio, despliegue, base de datos, buckets, secretos, provider adapters y ledger propios. Greenhouse, Think, Verk y el sitio público podrán consumir contratos versionados, pero no alojarán la lógica ni escribirán sus tablas.
2. **Full API Parity by birth.** Cada capability nace como primitive server-side transport-neutral con schemas
   versionados, command/reader, auth, idempotencia, audit, errores y evidencia de conformance antes de su primera
   surface. UI, HTTP API, SDK, MCP/agentes, CLI/runbooks, workers, eventos, sister platforms y E2E son clientes
   del mismo contrato; ninguna acción de negocio será UI-only ni transport-only.
3. **Autonomía gobernada, no chat que gasta.** El agente puede investigar, componer un brief, elegir una plantilla, proponer proveedor, estimar créditos y preparar una corrida. Una acción con coste, acceso a material restringido, entrega externa o publicación exige autorización explícita: `propose → reserve → approve → execute`.
4. **Experiencia creativa y agents primero; canvas después.** El V1 se opera con briefs, referencias, tratamientos, candidatos, revisión y flujos curados parametrizables (por ejemplo, still-to-video, video repair, audio/foley, set de RRSS). El sistema compila decisiones aprobadas en una receta. Un canvas DAG libre es una proyección posterior sobre el mismo runner, no el MVP ni el centro de gravedad.
5. **Assets, linaje y créditos son dominio first-class.** El sistema conserva una copia durable autorizada, hash, derechos, referencias, modelo/proveedor, prompt/brief versionado, revisiones y derivaciones. El crédito vendible se registra en un ledger append-only independiente del costo bruto del proveedor.
6. **Cloud-native y async.** El control plane es un servicio web/API; las corridas de media viven en workers separados, idempotentes y observables. Cloud Tasks sólo despacha; Cloud Run Jobs ejecuta o supervisa trabajo largo. No se introduce Kubernetes, un bus complejo ni una plataforma de workflow externa en la fundación.
7. **Multi-tenant antes de ser externo.** Aunque el acceso inicial es interno, cada aggregate nace con `workspace_id`, roles, policy de asset y límites de gasto. El cliente no se habilita por un bypass futuro: se activa con entitlements, permisos, aprobaciones y cuotas ya existentes en el contrato.
8. **Un producto, tres modos de operación.** `client-operated`, `co-operated` y `efeonce-managed` usan los mismos runs, assets, templates, commands y policies. Son asignaciones de autoridad y responsabilidad, no deployables, tiers ni una nueva modalidad comercial.

### Alternatives Considered

- **Construirlo dentro de Greenhouse:** rechazado. Acopla media/worker/costo/asset storage a un producto ya pesado y diluye su frontera como hub.
- **SaaS UI-first y añadir agentes/MCP después:** rechazado. Deja la lógica en pantallas, crea parity retroactiva y convierte a los agentes en automatización frágil de clicks.
- **Un único proveedor para toda modalidad:** rechazado. Los pilotos muestran que fidelidad de set, comportamiento humano, texto/practicals y foley requieren rutas distintas y evaluación por caso.
- **Canvas libre tipo ComfyUI/Higgsfield como MVP:** rechazado. Hace opaco el gasto, aumenta carga cognitiva y no captura aún la IP de dirección de Efeonce.
- **Reventa simple de requests del proveedor como créditos:** rechazado. El producto vende una capability creativa gobernada —dirección, plantillas, QA, storage y memoria— no minutos de un modelo sin contexto.
- **Agente autónomo que ejecuta/pública sin aprobación:** rechazado. Un LLM no posee presupuesto, derechos de uso ni autoridad creativa/comercial.

### Consequences

- **Positivas:** capability defendible de Efeonce; misma operación por UI/MCP/agente; memoria creativa acumulable por marca/proyecto; elección de motor basada en evidencia y no en marca; futura oferta cliente sin re-arquitectura.
- **Costos:** nuevo repositorio y operación cloud; disciplina de contracts/auditoría; actualización continua de adapters, precios y evaluaciones; ownership explícito de material con derechos.
- **Riesgos que permanecen:** drift de modelos, costo variable, outputs que parecen correctos pero fallan dirección física, y ambigüedad comercial de créditos. Todos se mitigan con review humana, fixtures/evals, reservas de crédito y políticas de aprobación, no con prompt más largo.

### Invariants

- La UI, MCP, agentes, CLI y workers consumen commands/readers canónicos; no hay lógica de negocio sólo en una surface.
- Parity se evalúa por capability y desde su primer slice ejecutable. No significa API pública, disponibilidad
  idéntica ni autonomía irrestricta: una surface puede quedar `policy-blocked`, pero esa ausencia debe ser
  explícita y machine-readable, no una implementación pendiente escondida.
- El primer provider call billable ya entra por API/SDK o harness de conformance → command → adapter → runner;
  ningún script, UI, CLI o MCP llama un SDK de provider directamente.
- Actor y workspace son trusted context derivados server-side de identidad/binding. Nunca se confían desde
  body, query o headers aportados por el caller.
- Cada write reintentable lleva actor, `workspace_id`, idempotency key, audit event y estado observable.
- Los providers nunca son source of truth de un asset o de su costo final.
- Los créditos se reservan y liquidan en ledger append-only; un contador mutable no basta.
- Un asset o run no cruza workspaces por URL, prompt, cache, log, evento ni herramienta MCP.
- `completed` por un proveedor significa candidato técnico, no aprobación creativa ni permiso de publicación.
- Greenhouse consume proyecciones o contratos del Studio; no hay DB compartida, sesión compartida ni acceso administrativo implícito.
- Cada run resuelve antes de ejecutar quién opera, quién aprueba creatividad, quién autoriza gasto, quién gobierna el template, quién responde por derechos y quién autoriza delivery.
- Cambiar de modo operativo conserva workspace, brief, assets, lineage, review y ledger; no crea un handoff paralelo ni eleva permisos por sí solo.
- Efeonce sólo compromete métricas de delivery sobre el scope cuya dirección y ejecución controla. `Client-operated` no hereda por defecto el SLA de un Managed Squad.
- El contenido editorial puede informar lenguaje e hipótesis, pero nunca crea commands, schemas, templates,
  provider routes, acceptance criteria o tasks por inferencia. Greenhouse autoriza la implementación mediante
  EPIC-028 y sus `TASK-###`; Globe posee el código, runtime y evidencia técnica.

### Revisit When

- Se complete el hardening del bootstrap y las primeras tasks canónicas de Greenhouse prueben el spine API y
  un provider canary end-to-end en Globe.
- Se habilite el primer workspace cliente o se comercialicen créditos — requiere revisión legal, fiscal, billing y política de derechos antes de activar pagos.
- Una modalidad requiera GPU/latencia que Cloud Run Jobs no resuelva de forma económica.
- El catálogo o las condiciones de proveedores cambien materialmente, o los evals de fidelidad contradigan el router vigente.

### Related historical proposals

Los documentos Greenhouse de Media Foundry, Creative Flow Studio y Creative Video Studio quedan **superseded como ubicación de runtime**. Sus principios útiles (provider neutrality, async, aprobación, historial del piloto) son evidencia histórica; no autorizan implementar media en Greenhouse.


---

## Delta 2026-07-14 — la frontera con el *sourcing* de stock: **generar** y **adquirir** son lo mismo, **buscar** no

**Por qué esta Delta.** Este ADR habla de *"producir, revisar y operar"* media. Un agente lo leyó y preguntó lo obvio: **¿y comprar una foto de stock?** No es generación. ¿Cae fuera?

**No cae fuera.** El §5 ya lo dice —*"assets, linaje y **derechos**… ledger append-only"*— y el §3 también —*"una acción **con coste**… `propose → reserve → approve → execute`"*. **Adquirir derechos es dominio del Studio, igual que generarlos.** Esta Delta lo deja escrito para que nadie lo relea al revés.

**Pero la Delta también abre una puerta, y es deliberado.** Una capability de stock **no es una sola cosa**. Se parte limpio por **costo y derechos**:

| | Buscar | Licenciar |
|---|---|---|
| ¿Cuesta? | No | **Sí, e irreversible** |
| ¿Crea derechos? | No | **Sí** |
| ¿Necesita ledger/linaje? | No | **Sí** |
| ¿Estado? | Stateless | Asset durable |
| **Dueño** | **Greenhouse** | **Creative Studio** |

**Buscar vive en Greenhouse.** Es un adapter de tercero read-only, gratis y sin estado — lo mismo que `src/lib/ai/dataforseo.ts`. No toca ningún invariante de este ADR: no hay asset, no hay costo, no hay derechos, no hay ledger. Nace con contrato gobernado (capability + entitlement + ruta) y con eso lo operan UI, Nexa, MCP y los agentes por construcción.

**Licenciar no.** Construir el ledger de créditos, el registro de derechos y el linaje de assets dentro de Greenhouse es **exactamente el acoplamiento que este ADR rechazó** — y sería construirlo dos veces, porque `EPIC-028` lo va a construir igual.

**Y esa frontera es la que se quiere de todas formas.** Un agente que **busca y propone** es útil y barato. Un agente que **gasta plata solo** no lo es. Lo demostró la sesión del 2026-07-14: el guardrail dejó buscar libremente y **bloqueó dos veces al licenciar**. Esta Delta convierte esa frontera accidental en arquitectura.

### Invariantes que agrega

- 🔴 **NUNCA** llamar a un endpoint de proveedor que **consuma crédito** desde `src/lib/**`, `src/app/**` ni ningún runtime de Greenhouse. El adapter de búsqueda **ni siquiera recibe la credencial que gasta**: no es una convención, es lo que vuelve el bug **irrepresentable**.
- 🔴 **NUNCA** persistir en Greenhouse un ledger de créditos, un registro de derechos ni assets durables de un proveedor de media. Son aggregates del Studio.
- **SIEMPRE** que el Studio exponga su contrato de licenciamiento, **retirar** el puente out-of-band de Greenhouse (CLI + ledger-en-archivo). Es un workaround **declarado**, no una capa permanente.

### Puente temporal, mientras `EPIC-028` no exista

Licenciar queda **out-of-band, con gate humano**: CLI (precedente `pnpm ai:image`, que este repo ya trata como tooling fuera del runtime) + ledger append-only en archivo, commiteado — **git es el audit log** hasta que exista el del Studio. Declarado **temporal, con dueño (Growth/Content) y condición de retiro** según `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

**Implementación:** `docs/tasks/to-do/TASK-1411-shutterstock-stock-sourcing-capability.md`.
**Origen:** TASK-1410 (Radiografía AEO) usó Shutterstock ad-hoc con `curl` y destapó tres bug classes silenciosas — entre ellas una foto de la **Ruta 40 de Argentina** que la búsqueda devolvió para "Carretera Austral" porque traía `carretera` y `chile` entre sus keywords.

---

## Delta 2026-07-14 — un Studio, tres modos de operación

**Decisión aceptada.** Creative Studio debe poder ser operado por el equipo Efeonce, por el cliente o por ambos sin bifurcar plataforma, memoria ni modelo de dominio. La distinción vive en autoridad y accountability por run:

| Modo | Dirección / operación | Frontera de responsabilidad |
| --- | --- | --- |
| `client-operated` | El cliente dirige y corre templates dentro de sus entitlements. | Efeonce responde por plataforma y policy; el cliente por la ejecución y delivery que controla. |
| `co-operated` | Cliente y Efeonce se reparten lanes o etapas con un operador explícito. | Cada parte responde por el tramo controlado; budget, review y escalation se fijan antes de ejecutar. |
| `efeonce-managed` | Efeonce dirige la operación; el cliente conserva brief, brand authority y aprobación final. | Efeonce responde por el delivery pactado y puede comprometer OTD/FTR sobre ese scope. |

La autonomía se habilita de manera progresiva: mayor incertidumbre creativa, riesgo de marca, costo o complejidad de derechos exige más gobierno Efeonce; repetición aprobada y variables acotadas permiten operación cliente. Escalar entre modos debe conservar todo el contexto y no requiere reconstruir el proyecto.

**No cambia el modelo comercial por sí sola.** Los modos se asignan dentro de On-Going, On-Demand, Staff Augmentation o Sample Sprint respetando sus fronteras. Si Efeonce controla delivery, es capacidad gestionada; si una persona queda bajo dirección cotidiana del cliente, aplica Staff Augmentation y no puede etiquetarse como managed. Un acceso client-operated no es “Managed Squad más barato” ni hereda sus compromisos.

Los nombres exactos de roles/fields y el packaging quedan diferidos al bootstrap de EPIC-028, pero el contrato semántico no: todo run debe identificar operador, aprobadores de creatividad y presupuesto, autoridad de template/derechos y owner de delivery.

---

## Delta 2026-07-19 — soberanía de provider y portafolio creativo gobernado

**Decisión aceptada por el operador.** Los modelos nativos de Google se consumirán exclusivamente mediante
Google Cloud/Vertex AI. La presencia de Veo, Gemini Image, Gemini Omni, Lyria, Chirp u otro modelo Google en un
marketplace de terceros no autoriza esa ruta. Fal queda como provider agregado para modelos **no-Google** y
utilidades especializadas allowlisted; OpenAI se consume directo.

Creative Studio no expone un catálogo arbitrario de modelos a UI, MCP ni agentes. Expone capabilities
versionadas y un router que propone una ruta según operación, fidelity contract, asset policy, launch stage,
SLO y costo. El portafolio vigente, estados de promoción y registro machine-readable viven en
[Enterprise Model Portfolio V1](EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md) y
[Capability Registry V1](EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json).

### Invariantes que agrega

- modelo Google nativo → credencial, IAM, cuota, audit y ejecución directos en GCP;
- un endpoint `preview` requiere fallback y no puede sostener por sí solo un SLA;
- `provider completed` sólo crea un candidato; no crea aprobación, entrega ni publicación;
- `deprecated` y `blocked` son no-ejecutables; Seedance 2.5 permanece bloqueado hasta existir endpoint oficial
  verificable y superar evals;
- el precio relevante es costo por candidato aprobado y por familia entregada, no por request aislado;
- la amplitud del marketplace no equivale a allowlist productivo.

### Transparencia de ruta

Provider-neutral no significa provider-oculto. Antes de aprobar gasto, UI y MCP muestran provider,
modelo/version, readiness, limitaciones materiales y fallback propuesto. Después de ejecutar, el run muestra
la ruta real de cada attempt y cualquier fallback. Se mantienen privados keys, endpoints privilegiados, costo
vendor confidencial, margen Efeonce y prompt/IP no incluido en la policy de transparencia. La marca del modelo
aporta valor y auditabilidad, pero no define por sí sola la banda de Studio Credits.

**Reversibility:** `two-way-but-slow` para cambiar providers/modelos; la separación del contrato de capability
respecto del endpoint es obligatoria. **Confidence:** alta en provider routing y lifecycle; media en la
clasificación creativa hasta completar bake-offs. **Validated as of:** 2026-07-19.

---

## Delta 2026-07-20 — refinar es transversal, y por eso el Studio debe retener sus propios outputs

**Decisión aceptada.** Refinar un candidato ya producido es una **capacidad transversal de la plataforma**, no
una feature de un proveedor. El contrato expone una sola intención transport-neutral —"refina el candidato que
produjo la corrida X"— y el mecanismo nativo se resuelve server-side. Hay dos paradigmas y ninguno se nombra en
el contrato: **stateful** (el proveedor guarda la sesión y el edit se encadena por su id) y **reference-based**
(el output del padre se re-inyecta como base). El primero ata el refinamiento al proveedor que emitió la sesión;
el segundo no depende de ninguna y es el que permite refinar con **otro** motor.

**Es consecuencia de arquitectura, no de implementación.** El punto 5 de esta ADR —assets, linaje y créditos son
dominio first-class— ya obligaba a conservar una copia durable autorizada de lo producido. Refinar cross-model
convierte esa obligación en algo operativo: si el Studio no retiene los outputs de sus propias corridas de forma
content-addressed, un candidato sólo puede refinarse con el proveedor que lo generó, y *own the durable record*
queda como aspiración. La retención es la precondición de la soberanía de motor, no una optimización.

Un edit tampoco es un command nuevo: es una corrida, con la misma autoridad, el mismo gate de gasto, la misma
state machine y el mismo manifest. La parity nace por construcción en vez de agregarse después.

### Invariantes que agrega

- **NUNCA** exponer vocabulario de un proveedor en el contrato de refinamiento: un id de sesión de un modelo en
  una superficie no es una semántica de plataforma.
- **NUNCA** cambiar de paradigma en silencio; el modo con el que un edit se ejecutó es evidencia registrada en
  el manifest del intento.
- **NUNCA** encadenar un handle de sesión hacia un proveedor que no lo emitió, ni confiar en una referencia que
  su propio adapter no certificó como encadenable.
- **NUNCA** blanquear un derivado como material propio: la base de un edit arrastra los derechos del padre bajo
  una postura que un caller no puede declarar.
- **SIEMPRE** rechazar un refinamiento imposible antes de reservar gasto, nunca descubrirlo como error de
  proveedor a mitad de una corrida ya pagada.

**Reversibility:** `two-way-but-slow` — los dos paradigmas son intercambiables detrás del seam, pero retirar la
retención de outputs rompería la refinabilidad de todo candidato ya producido. **Confidence:** alta — verificado
en vivo por el seam completo el 2026-07-20 (reference-based, cross-model, stateful y referencias combinadas
imagen+vídeo). **Validated as of:** 2026-07-20. Detalle técnico:
`docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` → §"Edit / refine cross-model".

---

## Delta 2026-07-21 — el Studio ya es durable: aterrizó su primer datastore (TASK-1465)

**Estado que cambia.** Este ADR nació con el runtime, los datos y las credenciales gateados y un `Validated as of:
2026-07-19 — … sin workloads ni secretos`. Ese snapshot quedó atrás: `TASK-1465` está **complete, deployed y
live-verified (2026-07-21)**. Globe pasó de **no tener base de datos** (todo in-memory / per-proceso) a **durable**.

El §1 de la Decisión —*"Creative Studio tendrá … base de datos … propios"*— y el §5 —*"conserva una copia durable
autorizada … ledger append-only"*— dejan de ser sólo objetivo: existe un Cloud SQL `globe-pg` propio (Postgres 16,
`southamerica-west1`, IAM keyless sobre el connector, en Terraform) que respalda, detrás de sus ports ya existentes,
los cinco stores antes en memoria (sesiones, transacciones OAuth, experimentos, reportes de evaluación y el spend
fence de seguridad) más un audit log append-only. Ambos servicios Cloud Run corren durable en `maxScale=3`, lo que
**levanta el techo de HA** que ADR-004 gateaba en esta task.

**Sigue diferido (no lo abre esta Delta):** el modelo rico de workspace/members/grants persistido; el mecanismo
exacto de tenancy PostgreSQL/RLS que la arquitectura dejó abierto; persistir `maxScale` por IaC (`TASK-1508`); y la
habilitación de clientes/créditos comerciales, que sigue gateada por sus decisiones de legal/finanzas/derechos.
**Confidence:** alta — verificado en vivo. **Validated as of:** 2026-07-21. Detalle técnico:
[`creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md)
(SPEC-007) + `docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`.
