# Efeonce Marketing Studio — Operación híbrida con agentes: roles, work items y despachador Claude/OpenAI (ADR)

> **Status:** `Accepted` (2026-09-26). Implementación y rollout por tasks del EPIC-049; nada de este ADR está en
> runtime todavía. El modo interactivo (persona + skill de rol + Efeonce MCP) ya es posible en lectura hoy y en
> escritura cuando TASK-1894 y TASK-1899 estén en producción.
> **Date:** 2026-09-26
> **Deciders:** Julio Reyes (operador). Redacción: Claude.
> **Owner:** Efeonce Marketing Studio
> **Epic:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
> **Scope:** cómo personas y agentes especializados (planificador de medios, SEO/AEO, copywriter, QA creativo y de
> marca, analista de desempeño y los que vengan) trabajan en las mismas campañas de Studio con tecnología de Anthropic
> u OpenAI de forma intercambiable: modelo de trabajo (work items), registro declarativo de roles, identidad y
> autoridad del agente, tres modos de ejecución con un solo contrato, despachador con adaptadores por proveedor y
> gobierno (evals, costo, métricas, kill switch, procedencia, defensas contra inyección).
> **Reversibility:** `two-way-but-slow`. Work items y roles son datos nuevos que no alteran los existentes; el
> despachador y cada adaptador nacen detrás de flag. Lo lento de revertir es la delegación de identidad para corridas
> en segundo plano (toca Efeonce ID) y la costumbre del equipo de asignar trabajo a agentes.
> **Confidence:** `high` en la dirección (MCP como única vía, estado duradero en Studio, agente nunca con más
> autoridad que la persona, `T2` siempre humano); `medium` en la mecánica exacta de la delegación para corridas en
> segundo plano (requiere trabajo en Efeonce ID) y en la elección de runtime por defecto por rol (se decide por evals,
> no por preferencia); `low` en la estabilidad de las superficies de los proveedores: dos de las piezas relevantes
> están en beta y una está anunciada para retiro (§12).
> **Validated as of:** 2026-09-26 — repo y docs leídos: ADR de fuente única e ingesta y ADR de capa de estrategia
> (ambos Accepted), arquitectura de Studio v1.7, ADR API-first, TASK-1899 (escrituras MCP con canje RFC 8693 y
> `Efeonce-Delegated-Token`), TASK-1904 (plugin privado para Codex y ChatGPT), TASK-1909 (procedencia de IA),
> invariantes de Nexa (runtime de acción gobernada TASK-1137; abstracción de proveedores TASK-1091), ADRs de Globe
> (agentic peer, API Contract Spine, Model Lab, Video Effectiveness Agent) y ADR del gateway MCP. Hechos de
> proveedores verificados en documentación oficial el mismo día (§12).
> **Complementa:** [`EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md`](EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md)
> (paridad total, niveles `T0`/`T1`/`T2`, IA que propone y persona que confirma, procedencia) y
> [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md)
> (Studio + GCS como fuente única; un command, tres puertas). No reemplaza a ninguno: define **quién** ejecuta el
> trabajo, **cómo** se organiza y **con qué runtime**. Precisa un invariante de la capa de estrategia (§5.4).
> **Aplica:** [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) ·
> [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) ·
> [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md).

## 1. Contexto

La capa de estrategia ya decidió que los agentes (Claude, Codex, Nexa) pueden **ejecutar** toda acción de la UI de
Studio con la identidad delegada de la persona, con niveles de riesgo y procedencia. Lo que no decidió es **cómo se
organiza el trabajo** cuando los agentes dejan de ser un chat que alguien abre y pasan a ser colaboradores del
espacio de trabajo:

- **No existe la unidad de trabajo.** Studio registra campañas, piezas, copys, plan de medios y atención, pero no
  quién tiene que hacer qué, para cuándo, con qué insumos, qué entregó y quién lo revisa. Hoy ese trabajo vive en
  conversaciones sueltas y en la memoria de quien lo pidió.
- **Los agentes son sesiones, no roles.** Cada vez que alguien abre Claude Code, claude.ai, Codex o ChatGPT arma el
  contexto a mano. Ya existen skills de rol para el modo interactivo (planificador de medios, en creación SEO/AEO) y
  la skill `efeonce-campaign-planning`, pero no hay un registro que diga qué puede hacer cada rol, con qué
  herramientas, con qué límite de costo y con qué evaluación previa.
- **Dependencia de un proveedor.** El equipo usa tecnología de Anthropic y de OpenAI. Si el trabajo se acopla a un
  runtime (hilos, memoria o handoffs del proveedor), cambiar de modelo significa perder el trabajo o migrarlo.
- **No hay trabajo en segundo plano.** Un agente sólo trabaja mientras una persona lo mira. No puede tomar una tarea
  asignada, hacerla y dejar un borrador para revisión, ni correr una lectura semanal programada.
- **Ya hay piezas reutilizables en casa.** Globe tiene un despacho confiable (contexto derivado del servidor, puertos
  y adaptadores de proveedor, un solo punto de invocación, máquina de estados de corridas con lease y recuperación
  por lectura) y Nexa tiene un runtime de acción gobernada (`propose → confirm → execute`, registro determinístico,
  ledger de eventos, señal de propuestas no autorizadas). Construir un runtime paralelo sin mirar eso sería
  reinventar.

## 2. Drivers de la decisión

1. **Agentes como colaboradores del espacio de trabajo, no chats sueltos** (operador, 2026-09-26). El trabajo se
   asigna, se entrega, se revisa y se traspasa dentro de Studio, sea quien sea el que lo haga.
2. **Intercambiabilidad Claude ↔ OpenAI.** Ningún dato del trabajo puede depender del proveedor que lo ejecutó.
3. **Full API Parity.** Work items, roles y corridas son capacidades de Studio: command, `/api/v1`, registro de
   operaciones y tool MCP federada, igual que todo lo demás.
4. **Autoridad acotada por construcción.** Un agente nunca puede más que la persona por la que actúa, y lo que
   aprueba, publica, gasta o destruye siempre pasa por una persona.
5. **Evidencia antes de autonomía.** Un rol no trabaja solo hasta demostrar, con evaluaciones, que su trabajo sirve.
6. **Costo gobernado.** Cada corrida tiene techo; cada rol y cada organización tienen presupuesto.
7. **Reusar antes de construir**, respetando la frontera Greenhouse ↔ Globe y el modelo de migración modular
   (EPIC-027: no crear deployables ni paquetes compartidos por anticipado; nacer listo para extraerse).
8. **Ausencia ≠ cero.** Un rol sin evaluación es «sin evaluar», una corrida sin costo reportado es «sin dato».

## 3. Opciones consideradas

### 3.1 Cómo se conecta el agente con Studio

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Runtime por proveedor con integraciones propias** (funciones o SDK de Studio embebidos en cada runtime) | Máximo control por proveedor | Dos implementaciones de cada acción; la autoridad se reimplementa por runtime; cada cambio de Studio rompe dos integraciones | Rechazada |
| **B. Acceso directo a la API `/api/v1` con credencial del agente** | Una sola API | Salta el canje por persona del gateway; el agente queda con un bearer de servicio que no sabe quién pidió el trabajo | Rechazada |
| **C. Sólo por Efeonce MCP** (`mcp.efeonce.org`, OAuth, mismas tools que usa una persona) | Anthropic y OpenAI hablan MCP remoto con OAuth (§12); una sola superficie gobernada; autoridad por persona ya resuelta (canje RFC 8693, TASK-1899) | Depende de la disponibilidad del gateway; toda capacidad debe estar federada antes de que un agente la use | **Aceptada** |

### 3.2 Dónde vive el estado del trabajo

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. En el proveedor** (hilos, sesiones, memoria o conversaciones del runtime) | Cero modelado | El trabajo queda atado al proveedor y a su retención; no es auditable por Studio; cambiar de modelo lo pierde; en Claude Managed Agents el historial vive en el servidor de Anthropic y no es elegible para ZDR (§12) | Rechazada como fuente |
| **B. En Studio** (work items, entregables como borradores, corridas registradas) | Proveedor intercambiable; auditoría, métricas y recuperación propias; la persona ve el trabajo en la UI | Hay que modelar work items y corridas | **Aceptada**; el estado del proveedor es memoria efímera de una corrida |

### 3.3 Qué despachador ejecuta las corridas en segundo plano

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Reusar el runtime de Globe** (despacho confiable + `creative-runner` + adaptadores de proveedor) | Patrones maduros y probados en producción: contexto derivado del servidor, puertos y adaptadores, un solo punto de invocación, recuperación por lectura | Globe es plataforma hermana y producto comercial propio: compartir runtime, base, secretos o IAM viola la frontera; sus adaptadores son de **generación de medios** (imagen, video, audio), no bucles de agente con tools MCP; ataría la operación de Studio al ciclo de releases de Globe | Rechazada como runtime; **se reusan sus patrones** |
| **B. Reusar el runtime de acción gobernada de Nexa** como despachador | Mismo principio (`propose → confirm → execute`), registro determinístico, ledger y señales | Vive dentro de un turno de chat de Greenhouse en Vercel; sus proveedores son de chat (`NexaChatProvider`), no runtimes de agente de larga duración; opera commands de Greenhouse, no de Studio; pondría el estado del trabajo de Studio en Greenhouse | Rechazada como despachador; **Nexa es cliente** de las mismas tools (§4.6) y su loop es la misma semántica que `T2` |
| **C. Runtime de agentes de plataforma nuevo** (servicio Efeonce compartido) | Un solo runtime para Greenhouse, Globe, Studio y Wave | Hoy tiene un solo consumidor; crear un deployable compartido por anticipado contradice EPIC-027 y la prueba del segundo consumidor | Rechazada por ahora; **disparador de promoción** en §8 |
| **D. Despachador delgado en Studio**, en su runtime asíncrono (Cloud Run, como el worker de medios), con adaptadores por proveedor detrás de un puerto, reusando patrones de Globe y Nexa e infraestructura existente (gateway, canje de Greenhouse, Efeonce ID) | Estado junto al dato que gobierna; cero acoplamiento de runtime entre productos; los contratos del puerto nacen sin tipos de Studio → extraíble a plataforma cuando llegue el segundo consumidor | Studio mantiene un componente más | **Aceptada** |

### 3.4 Con qué identidad actúa el agente

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Identidad de servicio del agente para todo** | Simple; no depende de la persona | El agente tendría autoridad propia, más amplia que la de quien asignó; la auditoría pierde a la persona; choca con la capa de estrategia (actor = persona) | Rechazada como regla general |
| **B. Identidad delegada de la persona para todo** | Autoridad y auditoría correctas | Las corridas programadas no tienen una persona presente que las origine | Rechazada como regla única |
| **C. Delegada para trabajo asignado; de servicio sólo para corridas programadas y sólo `T0`/`T1`** | Cada caso con la autoridad mínima que lo explica; `T2` siempre humano | Dos caminos de identidad que gobernar | **Aceptada** |

### 3.5 Cómo se describe un rol

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Prompt y configuración por proveedor** (un agente en la consola de cada uno) | Rápido | Dos definiciones que divergen; sin versión ni evaluación comparables | Rechazada |
| **B. Tarjeta de rol declarativa y versionada en Studio**, compilada por cada adaptador al formato del proveedor | Una definición, portable; versión, evaluación y kill switch por rol | Hay que mantener el compilador por adaptador | **Aceptada** |

## 4. Decisión

### 4.1 Work items: la unidad de trabajo híbrido

- Entidad nueva en Studio (nombre de trabajo `work_item`), siempre dentro de una campaña (y, cuando exista, de un
  programa). Campos: **tipo** (de un catálogo de tipos: plan de medios, brief SEO/AEO, set de copys por canal, QA
  creativo y de marca, lectura de desempeño, y los que vengan), **responsable** (una persona **o** un rol de agente
  en una versión dada), **quién lo pidió** (siempre una persona o un programa creado por una persona), **estado**,
  **insumos** (referencias versionadas: brief, plan, modelo de cliente, snapshots de Search Visibility 360, piezas,
  aprendizajes; nunca copias), **entregable** (referencias a borradores en Studio), **revisión** (quién revisa y con
  qué criterio) y **traspaso** (el siguiente tipo de trabajo y rol, si corresponde).
- Máquina de estados declarada y aplicada en el command:
  `draft → ready → assigned → in_progress → submitted → in_review → accepted | changes_requested`, con `blocked` y
  `cancelled` desde cualquier estado no terminal y `handed_off` cuando la aceptación crea el work item siguiente.
  `changes_requested` vuelve a `assigned` con la observación como insumo nuevo.
- **El entregable de un agente nace como borrador con procedencia** (modelo TASK-1909): modelo y proveedor, runtime,
  rol y versión, instrucción y skills con versión, insumos con ids y versiones, corrida y costo. Una persona lo
  acepta (`T1`); aprobar lo que el borrador alimenta (plan, presupuesto, versión) sigue siendo `T2` según la capa de
  estrategia.
- **Traspaso entre roles = work item nuevo en Studio**, no handoff dentro del proveedor. Así el trabajo sobrevive a
  cualquier cambio de runtime y cada eslabón queda revisable.
- **Paridad total:** crear, asignar, reasignar, cambiar estado, aceptar, pedir cambios, cancelar y leer work items
  tienen command, ruta `/api/v1`, entrada en `operations.ts` con nivel de riesgo y tool MCP federada. La UI no tiene
  acciones propias.
- **Asignar a un rol de agente es `T1` dentro del techo de costo del rol y de la organización** (el techo es
  presupuesto preautorizado); una asignación que excedería el techo es `T2` y exige confirmación de una persona.

### 4.2 MCP es la única vía de acción

- Un agente toca Studio, Greenhouse y Search Visibility 360 **sólo** mediante tools de Efeonce MCP en
  `https://mcp.efeonce.org/mcp`. Es lo que vuelve al runtime intercambiable: Claude (Agent SDK, Managed Agents,
  conector MCP de la Messages API, claude.ai, Claude Code) y OpenAI (Agents SDK, tool MCP remota de Responses API,
  Codex, ChatGPT) hablan MCP remoto con autenticación por bearer u OAuth (§12).
- **Sin puertas laterales:** el agente nunca recibe el bearer de servicio de Studio (`mst_…`), credenciales de
  Cloud SQL, URLs firmadas de subida fuera de las que emite una tool, ni acceso a APIs de plataformas publicitarias
  que no pase por un adaptador gobernado.
- **Lista blanca de tools por rol** aplicada en dos capas: el adaptador configura el runtime para exponer sólo las
  tools del rol (filtros de tools de cada proveedor) y Studio/gateway rechaza cualquier tool fuera de la lista de la
  corrida aunque el runtime la intente. Una tool nueva en el gateway no aparece sola en un rol: se agrega a su
  tarjeta con versión nueva.
- El agente nunca pasa binarios dentro de una llamada MCP: los bytes van por URL firmada directo a GCS (ADR de
  fuente única).

### 4.3 Registro de roles de agente (declarativo y portable)

- Entidad versionada en Studio (nombre de trabajo `agent_role`), dato y no código. Cada **tarjeta de rol** declara:
  - **misión** y tipos de work item que acepta;
  - **skills** con nombre y versión (las mismas skills de rol del modo interactivo; el despachador las carga en el
    runtime, nunca las reescribe);
  - **tools permitidas**, cada una con su nivel: `T0` y `T1` se ejecutan directo; `T2` **sólo como propuesta**
    (`dryRun` → digest registrado en el work item para que una persona confirme);
  - **límites:** techo de costo por corrida, techo mensual del rol, turnos y tokens máximos, duración máxima, y
    presupuesto de proveedor de datos (cero por defecto: un rol nunca dispara gasto de proveedor, §4.7);
  - **runtime y modelo preferidos** (`{proveedor, runtime, modelo}`) con alternativas ordenadas, configurables sin
    cambiar la tarjeta de misión; la elección efectiva se registra en cada corrida;
  - **set de evaluación** (referencia versionada) y el estado de evaluación por combinación rol × runtime × modelo;
  - **modos habilitados** (interactivo, segundo plano, programado), cada uno con su compuerta (§4.8);
  - **kill switch** propio.
- **Roles iniciales:** planificador de medios, SEO/AEO, copywriter, QA creativo y de marca, analista de desempeño.
  Más roles se agregan como dato con la misma tarjeta.
- **Portabilidad:** cada adaptador compila la tarjeta al formato de su proveedor (instrucciones, skills, servidor MCP
  y filtro de tools, políticas de permiso, límites). La tarjeta no contiene sintaxis de ningún proveedor.
- Crear o cambiar una tarjeta de rol es `T1` con capability restringida; habilitar un modo de ejecución o subir un
  techo de costo es `T2`.

### 4.4 Identidad y autoridad

- **Corrida delegada (trabajo asignado):** el agente actúa con la identidad delegada de la persona que asignó el work
  item. Autoridad = intersección de las capabilities de esa persona (releídas en cada llamada por el canje de
  Greenhouse, TASK-1899) con la lista de tools del rol. Auditoría: «persona X, ejecutado por agente `<rol>@<versión>`
  (corrida R, runtime, modelo)». Si la persona pierde una capability o se revoca la delegación, la siguiente llamada
  falla cerrada.
- **La delegación para segundo plano la emite sólo Efeonce ID** (`auth.efeonce.org`), nunca el gateway, Studio ni un
  proveedor. Principio decidido, mecánica abierta (§11): un token corto por corrida, con la persona como sujeto y el
  agente como actor (claim `act` de RFC 8693), audiencia `mcp.efeonce.org`, scopes ⊆ lista del rol, atado al work
  item y a la corrida, revocable y sin refresh de larga vida entregado a terceros. Hasta que exista, el modo en
  segundo plano delegado no se habilita.
- **Corrida programada:** actúa una **identidad de servicio de agente** (por rol), limitada a `T0` y `T1`, que sólo
  crea borradores y work items nuevos; nunca edita contenido aceptado por una persona. La programación la crea una
  persona (`T2`), que queda registrada como responsable del programa; la auditoría registra
  «servicio `<rol>`, programa P de la persona X».
- **`T2` siempre requiere confirmación de una persona:** `dryRun` → digest de propuesta → confirmación explícita,
  según TASK-1899. Una confirmación sólo es válida desde un token **sin** claim `act` (la persona misma, en un
  cliente interactivo o en la UI). Un agente en segundo plano o programado nunca confirma: deja la propuesta en el
  work item.
- **Un agente nunca tiene más autoridad que la persona que lo asignó**, ni la identidad de servicio más que `T1`.

### 4.5 Tres modos de ejecución, un contrato

| Modo | Quién inicia | Identidad | Dónde corre | Estado |
|---|---|---|---|---|
| **1. Interactivo** | Una persona invoca el rol desde Claude Code, claude.ai, Codex o ChatGPT con la skill de rol + Efeonce MCP | La persona (su propio token OAuth) | En el cliente de la persona | Disponible hoy en lectura; escrituras cuando TASK-1894/1899 estén en producción; distribución en ChatGPT/Codex por TASK-1904 |
| **2. Delegado en segundo plano** | Asignar un work item a un rol dispara el despachador | Delegada de la persona que asignó (§4.4) | Adaptador del proveedor elegido | Requiere despachador, delegación de Efeonce ID y rol evaluado |
| **3. Programado** | El despachador por programa (p. ej. lectura semanal) | Servicio de agente, sólo `T0`/`T1` | Igual que el modo 2 | Requiere lo anterior + programa creado por una persona |

- **Contrato único de corrida:** `{rol@versión, work_item, insumos, runtime, modelo, identidad, techo}`. El mismo
  contrato vale para los tres modos; en el modo 1 la corrida se registra por una tool `T1` (reclamar el work item y
  cerrar la corrida con su entregable), para que métricas y auditoría no sean ciegas al trabajo interactivo.
- **Estado duradero sólo en Studio.** La sesión, el hilo o la memoria del proveedor son mecánica interna de una
  corrida; al terminar, el entregable y la procedencia ya están en Studio y la sesión del proveedor puede borrarse.
  Subagentes y handoffs dentro de una corrida están permitidos como mecánica interna, con la misma identidad y la
  misma lista de tools o menos (nunca más).
- **El despachador** (Studio, runtime asíncrono en Cloud Run junto al worker de medios): toma el evento de
  asignación, valida rol, compuertas, techo y delegación, elige runtime según la tarjeta, abre la corrida con **una
  sola clave de idempotencia por corrida lógica**, invoca el adaptador, registra uso y costo informados por el
  proveedor, y cierra la corrida. Ante timeout o fallo ambiguo **lee primero** el estado (en Studio y en el
  proveedor) antes de reintentar; nunca relanza a ciegas una corrida que pudo haber escrito.
- **Adaptadores iniciales** (detrás de un puerto sin tipos de Studio, cada uno detrás de su flag):
  - `claude-agent-sdk` — bucle del Claude Agent SDK corriendo en el worker de Studio, Efeonce MCP por HTTP con el
    token de la corrida en cabecera;
  - `claude-managed-agents` — agente alojado por Anthropic; el MCP se declara en el agente y la credencial se inyecta
    por sesión (beta, sin ZDR, §12);
  - `openai-agents-sdk` — bucle del Agents SDK de OpenAI en el worker, MCP por Streamable HTTP con cabecera;
  - `openai-responses` — tool MCP remota de la Responses API, con la autorización reenviada en cada request
    (OpenAI no la guarda, §12).
  Qué adaptador queda por defecto por rol lo deciden las evals, no una preferencia.
- **Credenciales del proveedor de modelo:** claves de API de Efeonce en Secret Manager, resueltas en el servidor.
  Nunca la sesión personal de claude.ai o ChatGPT de nadie (Anthropic no permite ofrecer login de claude.ai en
  productos construidos sobre el Agent SDK sin aprobación previa, §12).

### 4.6 Reuso de Globe y Nexa (decisión)

**El despachador vive en Studio (§3.3 D) y no reusa el runtime de Globe ni el de Nexa.** Reusa sus **patrones** y la
infraestructura común, y deja una puerta explícita para Nexa como cliente:

| De dónde | Qué se reusa | Cómo |
|---|---|---|
| Globe (API Contract Spine, Model Lab, despacho confiable) | Contexto confiable derivado del servidor, nunca del payload; puertos + adaptadores inyectados; un solo punto de invocación del proveedor; máquina de estados de corrida con lease y fencing; recuperación por lectura tras timeout; una clave de idempotencia por corrida lógica; techo de gasto verificado **antes** de gastar; «el agente compila intención, no ocupa la autoría» | Como patrón y contrato en el código de Studio; cero runtime, base, secreto o IAM compartido |
| Nexa (TASK-1137, TASK-1091) | `propose → confirm → execute` (es la misma semántica que `T2`: el LLM nunca ejecuta la mutación); registro determinístico de acciones; ledger append-only de eventos; señal de propuestas no autorizadas; abstracción de proveedor con selección interna | Mismo diseño en el ledger de corridas y señales de Studio |
| Plataforma existente | Gateway `mcp.efeonce.org`, canje RFC 8693 de Greenhouse, Efeonce ID, `get_greenhouse_skill` para manuales servidos | Se consumen tal como están; lo nuevo (delegación para segundo plano, clase de scope de escritura) se agrega en su dueño |
| **Nexa como cliente** | Nexa opera Studio a través del gateway MCP con las mismas tools, niveles y roles que cualquier otro cliente | Cierra en parte la pregunta 5 de la capa de estrategia: Nexa no tiene canal propio hacia Studio |

Razones: la frontera Greenhouse ↔ Globe prohíbe compartir runtime, base, sesión o secretos; los adaptadores de Globe
resuelven otro problema (generación de medios); el runtime de Nexa vive dentro de un turno de chat de Greenhouse y
pondría el estado de Studio fuera de Studio; y un runtime de plataforma nuevo tendría un solo consumidor. El puerto
del despachador nace sin tipos de Studio para poder promoverse a plataforma (§8).

### 4.7 Gobierno

- **Evals por rol antes de autonomía.** Cada rol tiene un set versionado de work items de referencia con rúbrica:
  chequeos objetivos automáticos (formato, límites del catálogo de canales, citas con fuente, ausencia ≠ cero,
  cero `T2` ejecutados) separados de criterios humanos que nunca se autocalifican. Se evalúa por combinación
  **rol × runtime × modelo**; cambiar cualquiera de los tres, la versión de la tarjeta o las skills exige una
  evaluación nueva. Sin evaluación aprobada vigente, el rol sólo funciona en modo interactivo.
- **Escalera de autonomía:** interactivo → segundo plano con revisión obligatoria → programado. Cada peldaño se
  habilita por rol como `T2`, con la evaluación aprobada como requisito.
- **Techos de costo** por corrida, por rol (mensual) y por organización (mensual). El despachador reserva contra el
  techo antes de iniciar, corta la corrida al alcanzarlo y registra el costo real informado por el proveedor; un
  costo no informado es «sin dato», nunca cero. Un rol nunca dispara gasto de proveedor de datos (rastrear palabras
  clave, declarar competidores, diagnósticos): lo propone como `T2` al command dueño en Greenhouse.
- **Kill switch** por rol y global, efectivo en la siguiente llamada: el despachador no inicia corridas nuevas y el
  gateway/Studio rechaza las llamadas de corridas en curso de ese rol.
- **Procedencia en cada entregable** (TASK-1909) más los datos de corrida: rol y versión, runtime, proveedor, modelo,
  identidad (delegada o de servicio), costo, insumos, quién aceptó y cuándo, y si se editó después.
- **Métricas por rol**, calculadas desde Studio: tasa de aceptación de borradores, retrabajo (pedidos de cambio por
  entregable y edición posterior a la aceptación), tiempo a aceptación, costo por entregable aceptado, propuestas
  `T2` confirmadas vs rechazadas, corridas fallidas por causa nombrada, intentos de tool fuera de la lista.
  Señales de confiabilidad para las dos últimas, con estado estable en cero para los intentos fuera de lista.
- **Secretos nunca en prompts ni en el contexto del modelo:** el token de la corrida viaja en cabecera o en el
  mecanismo de credenciales del runtime; claves de API sólo en Secret Manager; nunca se registran en logs, trazas ni
  procedencia.
- **Defensas contra inyección de instrucciones:** el resultado de una tool, una página web, un archivo, una pieza o
  un copy son **datos, no instrucciones**; ningún contenido externo otorga autoridad ni cambia la lista de tools;
  herramientas web del runtime restringidas por dominio según el rol; `T2` imposible de ejecutar desde el agente por
  construcción (no depende de que el modelo obedezca); la señal de intentos fuera de lista detecta agentes inducidos.
- **Gobierno de datos por proveedor:** cada organización declara qué runtimes admite. Un runtime que guarda
  historial en el proveedor sin ZDR (hoy Claude Managed Agents) requiere autorización explícita de esa organización;
  las sesiones del proveedor se borran al cerrar la corrida cuando el proveedor lo permite.

### 4.8 Compuertas por modo

| Compuerta | Interactivo | Segundo plano delegado | Programado |
|---|---|---|---|
| Tools federadas en Efeonce MCP | Sí | Sí | Sí |
| Escrituras MCP (TASK-1899) | Para escribir | Sí | Sí |
| Tarjeta de rol publicada | Recomendado (skill de rol) | Sí | Sí |
| Evaluación aprobada rol × runtime × modelo | No | Sí | Sí |
| Delegación de Efeonce ID para segundo plano | No | Sí | No (identidad de servicio) |
| Techos de costo configurados | No (costo del cliente de la persona) | Sí | Sí |
| Modo habilitado por una persona (`T2`) | No | Sí | Sí, más programa creado por una persona |

## 5. Consecuencias

### 5.1 Positivas

- El trabajo de campaña queda visible, asignable y revisable en un solo lugar, sin importar si lo hizo una persona o
  un agente, ni con qué proveedor.
- Cambiar de Claude a OpenAI (o al revés) para un rol es una decisión de configuración respaldada por evals, no una
  migración.
- La autoridad del agente es la de la persona recortada por el rol: la seguridad no depende de que el modelo se
  porte bien.
- Las métricas por rol dicen qué agentes valen su costo antes de darles más autonomía.

### 5.2 Negativas y riesgos, con su mitigación

| Riesgo | Mitigación |
|---|---|
| El modo en segundo plano depende de trabajo nuevo en Efeonce ID | El modo interactivo no depende de eso; la delegación se diseña en su dueño (§11) y el modo 2 no se habilita hasta tenerla |
| Superficies de proveedor en beta o anunciadas para retiro (§12) | Adaptadores detrás de un puerto y un flag cada uno; ninguna dependencia de Agent Builder; estado duradero fuera del proveedor |
| Costo de modelos fuera de control | Techos por corrida, rol y organización con reserva previa y corte; costo real registrado |
| Fatiga de revisión | Sólo el entregable y `T2` requieren a una persona; las métricas de aceptación muestran qué rol no vale la revisión |
| Inyección de instrucciones desde contenido externo | Lista de tools en dos capas, `T2` imposible por construcción, dominios web restringidos, señal de intentos fuera de lista |
| Data de clientes en un proveedor sin ZDR | Runtimes admitidos por organización; borrado de sesiones; el estado vive en Studio |
| Un componente más que operar en Studio | Reusa el runtime asíncrono existente (Cloud Run); un solo despachador, adaptadores delgados |

### 5.3 Neutras

- El brief, el plan y los niveles de riesgo no cambian; las skills de rol del modo interactivo siguen siendo las
  mismas y la tarjeta de rol las referencia.

### 5.4 Precisión sobre la capa de estrategia

La capa de estrategia dice «**NUNCA** registrar al gateway, a un agente o a un modelo como actor de una escritura».
Este ADR la precisa sin relajarla para el caso delegado: el actor sigue siendo la persona y el agente queda como canal
y origen. Para el **modo programado** existe un actor de servicio por rol, limitado a crear borradores y work items
nuevos (`T1`), siempre ligado a un programa creado por una persona que queda como responsable. Ninguna identidad de
servicio aprueba, publica, gasta, destruye ni edita contenido aceptado.

## 6. Evaluación en cuatro pilares

| Pilar | Evaluación |
|---|---|
| **Seguridad** | Sólo MCP; autoridad = persona ∩ rol; `T2` sólo con confirmación humana desde un token sin `act`; identidad de servicio acotada a `T0`/`T1`; lista de tools en dos capas; delegación emitida sólo por Efeonce ID, corta y revocable; secretos fuera del contexto; runtimes admitidos por organización |
| **Robustez** | Máquina de estados de work item y de corrida aplicadas en commands; una clave de idempotencia por corrida lógica; `If-Match` en `T1`; procedencia inmutable; evals por combinación antes de autonomía |
| **Resiliencia** | Estado duradero en Studio: si un proveedor cae se cambia de adaptador sin perder trabajo; recuperación por lectura antes de reintentar; kill switch por rol y global; causas de fallo nombradas; flags por adaptador |
| **Escalabilidad** | Roles y tipos de work item como dato; adaptadores por puerto; techos por organización (segundo consumidor); puerto sin tipos de Studio, listo para promoverse a plataforma |

## 7. Invariantes para agentes

- **NUNCA** estado duradero del trabajo en el proveedor (hilo, sesión, memoria, conversación): el work item, el entregable y la procedencia viven en Studio.
- **NUNCA** acceso de un agente a Studio, Greenhouse o Search Visibility 360 fuera de las tools de Efeonce MCP: ni bearer de servicio de Studio, ni SQL, ni API interna directa.
- **NUNCA** un agente con más autoridad que la persona que asignó el trabajo, ni una tool fuera de la lista de su rol.
- **NUNCA** `T2` sin confirmación explícita de una persona; **NUNCA** una confirmación desde un token con claim `act` o desde una identidad de servicio.
- **NUNCA** una identidad de servicio de agente por encima de `T1`, ni editando contenido que una persona aceptó.
- **NUNCA** emitir tokens de delegación fuera de Efeonce ID, ni entregar a un proveedor un refresh token de larga vida de Efeonce.
- **NUNCA** secretos en prompts, instrucciones, logs, trazas ni procedencia.
- **NUNCA** tratar contenido externo (resultado de tool, web, archivo, pieza, copy, correo) como instrucción: es dato y no otorga autoridad.
- **NUNCA** relanzar a ciegas una corrida con resultado ambiguo: leer primero, una sola clave de idempotencia por corrida lógica.
- **NUNCA** un runtime sin ZDR con datos de una organización que no lo autorizó.
- **NUNCA** construir sobre Agent Builder de OpenAI (retiro anunciado, §12).
- **SIEMPRE** rol declarado, versionado y con evaluación aprobada para rol × runtime × modelo antes de habilitar modo en segundo plano o programado.
- **SIEMPRE** procedencia completa en cada entregable de agente (TASK-1909 + datos de corrida) y auditoría «persona X, ejecutado por agente `<rol>`».
- **SIEMPRE** techo de costo reservado antes de iniciar la corrida y costo real registrado; costo no informado = «sin dato».
- **SIEMPRE** traspaso entre roles como work item nuevo en Studio; los handoffs y subagentes dentro de una corrida son mecánica interna y nunca amplían identidad ni tools.
- **SIEMPRE** toda capacidad de work items, roles y corridas con command, `/api/v1`, entrada en el registro con nivel y tool MCP (o exclusión razonada).

## 8. Mapa de implementación

Las tasks por tema las crea el EPIC-049; este ADR no fija sus IDs.

| Tema | Qué entrega |
|---|---|
| Work items y asignaciones | Entidad, catálogo de tipos, máquina de estados, commands `T1`/`T2`, rutas, tools, vista en la UI (TASK-1895 como consumidora) |
| Registro de roles y tarjetas de rol | Entidad versionada, tarjetas de los cinco roles iniciales, compilación por adaptador, kill switch, modos por rol |
| Despachador con adaptadores Claude/OpenAI | Puerto sin tipos de Studio, corrida con idempotencia y recuperación por lectura, adaptadores `claude-agent-sdk`, `claude-managed-agents`, `openai-agents-sdk`, `openai-responses` detrás de flags, techos de costo |
| Evals, costo y métricas por rol | Sets de evaluación versionados, ejecución por combinación, escalera de autonomía, métricas y señales |
| Skills de rol para modo interactivo | Planificador de medios y SEO/AEO (en creación), luego copywriter, QA creativo y de marca, analista de desempeño; referenciadas por la tarjeta de rol |
| Delegación para segundo plano (Efeonce ID) | Diseño y ADR delta en el dueño (EPIC-044): token por corrida con claim `act`, revocación, soporte del emisor nativo para las tools de Studio |
| TASK-1899 | Escrituras MCP (clase de scope, canje por capability, `Efeonce-Delegated-Token`, `dryRun` → confirmación): base de toda escritura de agente |
| TASK-1904 | Plugin privado de Efeonce MCP para Codex y ChatGPT: canal del modo interactivo en OpenAI |
| TASK-1909 | Paquete de contexto por campaña y modelo de procedencia que usan los entregables de agentes |
| TASK-1905 · 1907 · 1908 · 1910 · 1911 | Capacidades de estrategia (canales, plan, SEO/AEO, medición, aprendizajes) que los roles operan como cualquier cliente |

**Disparador para promover el despachador a plataforma:** cuando un segundo producto (Greenhouse, Globe, Wave)
necesite asignar trabajo a agentes en segundo plano, se evalúa extraer el puerto y los adaptadores a un servicio de
plataforma con su propio ADR. Hasta entonces vive en Studio.

## 9. Rollback

- Cada adaptador y cada modo se apagan por flag; apagar el despachador deja los work items asignados a agentes en
  `assigned` y visibles para reasignar a una persona. No se borra ningún dato.
- El kill switch global detiene corridas nuevas y rechaza las llamadas de corridas en curso.
- La delegación para segundo plano se revoca en Efeonce ID; las tools de escritura se retiran de la federación sin
  tocar las lecturas (rollback de TASK-1899).
- Las skills de rol del modo interactivo siguen funcionando aunque todo lo anterior esté apagado.

## 10. Revisar cuando

- Un segundo producto necesite agentes en segundo plano (promoción a plataforma, §8).
- Claude Managed Agents salga de beta o cambie su elegibilidad de retención de datos.
- OpenAI cambie el estado de su Agents API gestionada o de la tool MCP remota de Responses API.
- La tasa de aceptación de un rol se mantenga baja pese a evaluaciones aprobadas (la evaluación no mide lo que importa).
- El volumen de confirmaciones `T2` o de revisiones frene el trabajo diario.

## 11. Preguntas abiertas (deliberadamente no decididas aquí)

> Resoluciones del operador (Julio Reyes) del 2026-09-26 marcadas en cada punto; el cuerpo del ADR no cambia.
> Decisiones del mismo día que precisan tasks sin ser preguntas de esta sección: grants de
> `marketing_studio.agent_role.manage` = `efeonce_admin` y `efeonce_operations` (relajar sigue `T2`, TASK-1914); asignar
> a un agente sobre el techo de costo se confirma con `marketing_studio.campaign.approve`, sin capability nueva (TASK-1913).

1. **Mecánica exacta de la delegación para segundo plano** en Efeonce ID: forma del consentimiento de la persona al
   asignar, TTL, atadura a work item y corrida, cómo el gateway la verifica y cómo se relaciona con el canje RFC 8693
   actual de TASK-1899 (hoy el emisor nativo está `unsupported` para las tools de Studio).
   **Resuelta en dueño y principios (2026-09-26):** unidad nueva **U22 de EPIC-044**, poseída por
   [`TASK-1917`](../../tasks/to-do/TASK-1917-efeonce-id-agent-run-delegation-act.md). Efeonce ID emite tokens cortos y
   revocables por corrida, con `act` (la persona delega en un rol de agente versionado), scopes ⊆ lista del rol, atados
   al work item y a la corrida, y reutiliza el canje RFC 8693 de Greenhouse que ya usa Studio; consumidor: modo delegado
   de TASK-1915. Vida máxima, forma del consentimiento y autenticación del despachador quedan en TASK-1917.
2. **Cómo se inyecta la credencial en cada runtime alojado** sin dejar un refresh token en el proveedor (p. ej. token
   corto por corrida en un vault de Managed Agents con rotación, vs sólo runtimes auto-hospedados para clientes).
3. **Dónde vive el set de evaluación y quién califica los criterios humanos** (Studio vs repo de skills; rotación de
   revisores).
   **Resuelto quién califica (2026-09-26):** `marketing_studio.agent_eval.grade` para `efeonce_admin`,
   `efeonce_operations` y `efeonce_account`, pero califican sólo personas nominales, una por disciplina (Medios,
   SEO/AEO, CRO, Copywriter, Designer y Creativo), designadas por el operador; sin rotación; `efeonce_admin` califica
   cualquier disciplina. Los nombres son un insumo pendiente del operador. Dónde
   vive el set sigue abierto (TASK-1916).
4. **Runtime por defecto por rol** (se decide por evals; ninguna preferencia fijada aquí).
5. **Nexa como runtime del despachador** (no sólo cliente): posible si Nexa llega a hablar MCP contra el gateway con
   la delegación de §4.4; hoy no.
6. **Catálogo de tipos de work item** exacto y su relación con el plan de contenidos de la capa de estrategia.
7. **Precios y unidades de costo por proveedor** (tokens, sesión alojada, horas de contenedor) y cómo se normalizan
   para comparar roles.
8. **Si el agente de servicio programado puede leer data competitiva** (`internal`) para campañas de clientes; hoy
   se asume que no.
   **Resuelta (2026-09-26):** los agentes programados **nunca** leen data competitiva `internal`, y tampoco los delegados
   en segundo plano; sólo el modo interactivo con la persona presente puede. Una excepción futura exige una decisión
   nueva y explícita por organización (opt-in), no un interruptor de política (TASK-1915, TASK-1908).

## 12. Hechos verificados de proveedores (verificado 2026-09-26)

Verificado en documentación oficial el 2026-09-26. Las superficies en beta pueden cambiar sin aviso; se reverifican
al implementar cada adaptador.

**Addendum de fuente 2026-09-29:** OpenAI confirma la Agents API como beta pública desde el 10-09 y anuncia hoy computer use mediante navegador alojado. La [guía actual](https://developers.openai.com/api/docs/guides/agents-api/overview) declara residencia solo en EE. UU. y ausencia de ZDR incluso con sandbox autoalojado; no extrapolarle el ZDR con Private Safety Processing de otros flujos API. GPT-6.1 Sol está en API (`gpt-6.1-sol`), Codex y Work, pero aún no en Chat. Su precio estándar es US$2/M input, US$0,10/M cached input y US$10/M output. [Sol](https://openai.com/index/introducing-gpt-6-1-sol/) y [DevDay](../../audits/platform/OPENAI_DEVDAY_2026_09_29_LAUNCH_INVENTORY.md). Esto abre una **evaluación** de Agents API y Sol para los roles; no modifica por sí mismo los cuatro adaptadores, el runtime preferido ni las gates de identidad y costo de esta decisión. La fila de Agents API del 26-09 siguiente conserva su evidencia histórica de esa fecha.

| Proveedor | Hecho | Fuente |
|---|---|---|
| Anthropic | El **Claude Agent SDK** es una biblioteca en Python y TypeScript que corre el binario de Claude Code con sus herramientas, permisos, sesiones, hooks, subagentes, skills y MCP. Verificado 2026-09-26 | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) |
| Anthropic | El Agent SDK conecta MCP por stdio, HTTP (Streamable) o SSE; para remotos acepta cabeceras (`Authorization: Bearer …`); **no ejecuta el flujo OAuth interactivo**: la app obtiene el token y lo pasa; las tools MCP requieren permiso explícito (`allowedTools`). Verificado 2026-09-26 | [Agent SDK · MCP](https://code.claude.com/docs/en/agent-sdk/mcp) |
| Anthropic | Sin aprobación previa, terceros no pueden ofrecer login de claude.ai ni sus límites en productos sobre el Agent SDK; se usa autenticación por API key. Verificado 2026-09-26 | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) |
| Anthropic | **Claude Managed Agents**: harness alojado (agente, entorno, sesión, eventos), sandbox de Anthropic o auto-hospedado, historial persistido en el servidor, ejecución programada; **beta** con cabecera `managed-agents-2026-04-01`; **no elegible para ZDR ni BAA HIPAA**. Verificado 2026-09-26 | [Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) |
| Anthropic | En Managed Agents el servidor MCP (URL remota) se declara en el agente y la credencial se provee por sesión mediante **vaults** (`static_bearer` o `mcp_oauth`, con refresh opcional hecho por Anthropic); los valores son de sólo escritura; los toolsets MCP usan por defecto la política **`always_ask`**. Verificado 2026-09-26 | [MCP connector (Managed Agents)](https://platform.claude.com/docs/en/managed-agents/mcp-connector) · [Vaults](https://platform.claude.com/docs/en/managed-agents/vaults) · [Permission policies](https://platform.claude.com/docs/en/managed-agents/permission-policies) |
| Anthropic | La política `auto` de Managed Agents **no es un control humano**: el servidor puede ejecutar una llamada sin que nadie la vea; para revisión humana obligatoria se usa `always_ask`. El servidor no toma instrucciones de resultados de tools, páginas ni respuestas MCP. Verificado 2026-09-26 | [Permission policies](https://platform.claude.com/docs/en/managed-agents/permission-policies) |
| Anthropic | **Conector MCP de la Messages API**: sólo servidores remotos por HTTP (Streamable o SSE), `authorization_token` por servidor (la app hace el OAuth), listas de tools permitidas o denegadas; **beta** con cabecera `mcp-client-2025-11-20` (la `2025-04-04` está deprecada); **no elegible para ZDR**. Un resultado de búsqueda mencionó una cabecera `mcp-client-2026-09-15`; **no verificado** en la página oficial leída | [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) |
| Anthropic | **Conectores personalizados de claude.ai** por MCP remoto: disponibles en Free, Pro, Max, Team y Enterprise; en Team/Enterprise los agrega un Owner y cada usuario se conecta individualmente; la conexión sale de servidores de Anthropic, no de la máquina del usuario. Verificado 2026-09-26 | [Custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) |
| OpenAI | **Agents SDK** (Python y TypeScript) con agentes, **handoffs**, **guardrails**, sesiones, **tracing** activado por defecto y human-in-the-loop; los guardrails de tools no se aplican a la llamada de handoff. Verificado 2026-09-26 | [Agents SDK (Python)](https://openai.github.io/openai-agents-python/) · [Agents SDK (JS)](https://openai.github.io/openai-agents-js/) · [Guardrails](https://openai.github.io/openai-agents-python/guardrails/) |
| OpenAI | MCP en el Agents SDK: tool MCP alojada vía Responses API, servidores Streamable HTTP, SSE (deprecado) y stdio; auth por cabeceras; filtrado de tools; aprobaciones `require_approval` (`always`, `never` o por tool). Verificado 2026-09-26 | [Agents SDK · MCP](https://openai.github.io/openai-agents-python/mcp/) |
| OpenAI | **Responses API, tool `mcp` remota**: `server_url`, `authorization` (OpenAI **no la guarda**; se reenvía en cada request), `allowed_tools`, aprobaciones **requeridas por defecto** (`mcp_approval_request` / `mcp_approval_response`); la retención del servidor remoto aplica aparte, incluso con ZDR. Verificado 2026-09-26 | [Remote MCP (Responses)](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) |
| OpenAI | La guía de agentes distingue tres runtimes: **Agents API** («OpenAI runs a managed Codex harness», estado guardado por OpenAI), **Agents SDK** (corre en la app) y **Responses API** (control directo). La página no declara si la Agents API está en beta ni nombra su endpoint: **no verificado** más allá de eso | [Agents guide](https://developers.openai.com/api/docs/guides/agents) |
| OpenAI | **Agent Builder** (parte de AgentKit) **se retira el 30 de noviembre de 2026**; ChatKit sigue disponible. Verificado 2026-09-26 | [Agent Builder](https://developers.openai.com/api/docs/guides/agent-builder) |
| OpenAI | **Codex** conecta servidores MCP por Streamable HTTP o stdio configurados en `config.toml` (compartido entre app, CLI e IDE), con login OAuth (`codex mcp login`) y soporte de CIMD y DCR. Verificado 2026-09-26 | [Codex · MCP](https://learn.chatgpt.com/docs/extend/mcp) |
| OpenAI | **ChatGPT** conecta un servidor MCP remoto en modo desarrollador (disponibilidad según cuenta y política del workspace) o por túnel seguro; los plugins publicados tienen revisión continua de tools. Detalle y certificación en TASK-1904. Verificado 2026-09-26 | [Connect to ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt) |

## 13. Referencias

- [Arquitectura de Marketing Studio](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) §4.2 «Operación híbrida con agentes»
- [ADR capa de estrategia](EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md) · [ADR fuente única e ingesta](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md) · [ADR API-first de Studio](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- [Full API Parity](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) · [Gateway Efeonce MCP](../EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) · [MCP de Greenhouse](../GREENHOUSE_MCP_ARCHITECTURE_V1.md) · [Servidor de autorización nativo](../EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
- [Nexa: invariantes (runtime de acción gobernada, proveedores)](../agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md) · [Arquitectura de Nexa](../GREENHOUSE_NEXA_ARCHITECTURE_V1.md)
- [Globe: ADR agentic peer](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) · [Globe: arquitectura](../EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md) · [Globe: API Contract Spine](../creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md)
- [Invariantes de superficie MCP](../agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)
- [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md) · TASK-1899 · TASK-1904 · TASK-1909 (en `docs/tasks/to-do/`)
