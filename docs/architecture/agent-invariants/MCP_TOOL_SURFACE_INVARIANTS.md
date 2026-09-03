# MCP Tool Surface — invariantes operativos para agentes

> **Tipo de documento:** Companion de invariantes (load-on-demand)
> **Creado:** 2026-08-29 por TASK-1785
> **Compartido con:** `TASK-1784` (ruteo de selección entre tools · §7), `TASK-1780` (manifiesto canónico de tools · §0)
> **Cargar al tocar:** `src/mcp/greenhouse/**`, `src/lib/api-platform/resources/ecosystem-*`, o cualquier reader cuyo DTO cruce a una tool.

Cargar este doc al agregar, modificar o federar una tool MCP; al escribir la descripción de una
tool; o al cambiar la forma de un DTO que cruza el lane ecosystem.

---

## 0. Qué tools existen: el manifiesto, y sólo el manifiesto (`TASK-1780`)

`src/mcp/greenhouse/tool-manifest.ts` es la fuente del inventario de tools MCP de Greenhouse.
`server.ts` registra **recorriéndolo** —definir una tool sin entrada rompe la construcción del
servidor— y el `name` y las `instructions` que el cliente MCP lee se **derivan** de él.

Dos banderas **ortogonales** por entrada: `writes` (muta estado de Greenhouse) y
`spendsProviderBudget` (compromete gasto real, al instante o de forma recurrente). **NUNCA**
fusionarlas en un `readOnly`: hoy todo lo que gasta también escribe, pero comprar datos sin mutar
nada propio sigue siendo un efecto secundario que el cliente necesita conocer. **NUNCA** describir
como lectura algo que compromete gasto.

**NUNCA** agregar un campo de federación al manifiesto: Greenhouse declara qué EXISTE, el gateway
decide qué CRUZA con revisión humana por tool.

---

## 1. La superficie agéntica es un CONTRATO, no una descripción

Una tool MCP no es un endpoint con documentación: es un contrato que un agente compone con otros.
Eso cambia dónde pueden vivir las reglas.

🔴 **NUNCA confiar en la prosa de la descripción para defender un invariante que se rompe ENTRE
dos tools.** Una descripción sólo puede gobernar lo que pasa dentro de su propia llamada. Si el
defecto aparece cuando alguien llama a dos y compone una respuesta, ninguna descripción lo ve —
por bien escrita que esté. Esa regla necesita viajar como **dato en el payload** o como una
lectura que haga lo correcto más barato que lo incorrecto.

**Caso fuente (TASK-1785):** el invariante `●` medido / `◑` estimado estaba escrito correctamente
en la descripción de cada tool SEO y en `§5` de la arquitectura del módulo. Y aun así nada impedía
que un agente promediara una posición de Search Console con una del SERP comprado, porque la mezcla
ocurría en la composición, no dentro de ninguna tool.

**SIEMPRE** que identifiques una regla del tipo *"nunca mezcles A con B"*, preguntar: ¿dónde ocurre
la mezcla? Si la respuesta es "entre dos llamadas", la regla necesita mecanismo, no redacción.

---

## 2. Toda cifra cruza con su naturaleza puesta

🔴 **NUNCA** emitir una magnitud a través del contrato agéntico sin que el payload declare de qué
naturaleza es y cuándo se capturó. Un número sin as-of se lee como vigente para siempre.

🔴 **NUNCA** rotular un RESULTADO con una sola procedencia cuando su DTO mezcla fuentes. Un DTO
mixto rotulado con una lente única es una mentira estructural aunque cada campo sea correcto — es
exactamente el defecto que `SeoPerformanceResult.source` tenía. La procedencia se declara por
sección/campo, en lista.

🔴 **NUNCA** introducir un valor de lente tipo `mixed` para "resolver" un DTO mixto. Deja rotular
la fila entera y parar ahí: esconde el desglose con un nombre más honesto. La lente es binaria; lo
plural es la lista de procedencias, y lo que se verifica es su cobertura.

**NUNCA** `0` donde corresponde `null`. Cero es una medición —miramos y no había—; ausencia es otra
cosa. Colapsarlas convierte un hueco en un hecho.

**Delta 2026-09-03 (`TASK-1805`) — la fórmula es provenance, y viaja con la cifra.** Toda cifra ETV
(`organic_etv`, tráfico estimado del prospecto, concentración por página/subdominio) cruza el contrato
agéntico con `etvMethodology { version, policyVersion, evidence, availableMethodologies[], comparability,
breakpointDate, providerCutoffAt }`. Reglas: **un DTO sirve UNA fórmula** (una serie mixta es un fallo,
`mixed_etv_methodology`, no un promedio); `not_available_for_method` **no es cero** ni `no_market_data` —
significa «hay dato, pero de otra fórmula» y el reader lo devuelve como `{ ok: false, reason, requestedMethodology,
availableMethodologies }` (el lane lo transporta como `errorCode`); **las tools nunca eligen fórmula**: la
servida la fija `GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION` del runtime, y ningún argumento de tool la
sobreescribe. La metodología es provenance **adicional** a la lente, no una lente nueva: `lens` sigue
binaria. Tools afectadas: `get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_prospect_diagnostic`.
Policy: `src/lib/growth/seo/etv-methodology/**`.

Implementación canónica del dominio SEO: `src/lib/growth/seo/lens.ts` (`SeoLens`, `resolveSeoLens`,
`SeoProvenance`, `SeoFigureShape`).

---

## 3. Una guarda es una afirmación hasta que un mecanismo la sostiene

Declarar un campo no es lo mismo que garantizarlo. Las tres capas que hacen la diferencia:

1. **El tipo.** Un campo de procedencia **requerido** en el miembro `ok: true` hace que `tsc` nombre
   uno por uno a los productores que no lo declaran. Es el guard más barato y el más difícil de
   evadir. **SIEMPRE** requerido, nunca opcional: un campo opcional es una sugerencia.
2. **La cobertura.** Un test que camina el DTO real y exige que **cada hoja numérica tenga
   exactamente un dueño**. Sin esto, un campo de sección con string libre es una intención con buen
   nombre: nada obliga a que las entradas declaradas cubran lo que hay. Debe detectar las **dos**
   direcciones — sin dueño (agujero) y con dos (ambigüedad, que no es redundancia).
3. **El censo de superficies.** `tsc` cubre al reader que devuelve un DTO tipado; **NO** cubre a la
   superficie. Alguien puede agregar una ruta al lane o registrar una tool cuyo contrato nunca
   declaró nada. El censo se compara contra el **filesystem** y contra `server.ts` — nunca contra
   una lista escrita a mano en un doc — y **en ambas direcciones**: una superficie viva sin censar
   falla, y un censo que nombra superficies muertas también, porque se lee como cobertura sin
   cubrir nada.

⚠️ **Un guard debe medir cuando CORRE, no cuando alguien lo escribió.** El repo es un checkout
compartido: una medición del filesystem envejece en minutos. Un guard que se mide a sí mismo al
ejecutarse no tiene esa ventana.

---

## 4. Contar tools: dos patrones que mienten, y los dos ya ocurrieron

**NUNCA** enumerar las tools de un dominio con un patrón de **prefijos de verbo**
(`get_|run_|track_`): se come `declare_seo_competitors` y `retire_seo_competitors`, y el total sale
corto **sin que nada falle**.

**NUNCA** usar una clase de caracteres **sin dígitos** (`[a-z_]*seo[a-z_]*`): se come
`get_seo_visibility_360`, en silencio. Este error se cometió dentro de la propia task que perseguía
esta clase de defecto — el patrón se ancla en el dominio y admite dígitos, con regresión para ambos.

**NUNCA** contar como tools los códigos de error del proveedor (`greenhouse_seo_invalid_response`,
`greenhouse_seo_policy_blocked`): parecen nombres de tool y no lo son.

⚠️ **El registry interno y el gateway NO son el mismo conjunto, y está bien.** El gateway federa
resolviendo contra **rutas HTTP del lane ecosystem**, no contra nombres del MCP interno. Por eso una
capacidad puede estar federada sin existir como `registerTool` interno (caso verificado:
`get_seo_provider_spend`). Al censar, anclar en la **ruta**, que es lo único que las dos superficies
comparten.

🔴 **Desde `TASK-1780` ese caso se DECLARA, no se deduce.** Vive en
`GREENHOUSE_GATEWAY_NATIVE_TOOLS` con su razón escrita, y el guard lo reporta si falta —una ausencia
sin declarar volvía a ser indistinguible de un olvido, que es el defecto que el guard existe para
cerrar—. Una declaración que dejó de aplicar también es finding: una excepción vencida se lee como
cobertura y no cubre nada.

✅ **Y contar dejó de ser un problema de patrón.** El inventario interno es
`src/mcp/greenhouse/tool-manifest.ts`: el servidor **registra recorriéndolo**, así que la cifra sale
del manifiesto o de `tools/list`, nunca de una regex sobre el fuente. Las dos formas de contar que
mintieron siguen cubiertas por regresión, pero ya no son el camino.

---

## 5. Federar es parte de "listo"

Una tool interna que no se federa **ni se excluye con razón escrita** es drift. El guard bidireccional
del gateway (`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`) lo pone rojo; el protocolo
completo vive en `efeonce-mcp/AGENTS.md`.

⚠️ **El paso 1 del protocolo ya no se escribe en el gateway** (`TASK-1780`). El inventario del guard se
**deriva** del manifiesto de Greenhouse: acá se agrega la entrada y se corre
`pnpm mcp:manifest:generate`; allá, `pnpm greenhouse:manifest:sync`. El artefacto viaja con
`manifestHash` y se verifica al cargar, así que editarlo a mano —la costumbre del espejo, medida dos
veces en dos semanas— lanza en vez de pasar en silencio. **NUNCA** editar
`greenhouse-tool-manifest.generated.ts` ni `tool-manifest.generated.json`: son artefactos.

⚠️ **La federación es CROSS-REPO y no se hace sola.** Antes de commitear en el repo del gateway
aplican las reglas de `CLAUDE.md § Cross-repo action safety`: relevancia operacional, estado del
último deploy y decisión explícita del operador cuando el repo tiene auto-deploy productivo.
Preferir PR sobre commit directo a `main`.

---

## 6. Escribir la descripción de una tool

**SIEMPRE** poner la advertencia donde se toma la decisión. El `summary` que devuelve la tool y su
`description` no son redundantes: el agente tiene el summary a la vista cuando compone, y la
descripción en su contexto de hace rato.

**SIEMPRE** que una tool devuelva dos series que no son comparables, decirlo **explícitamente** en
la descripción y repetirlo en el summary, nombrando **por qué** no lo son. "No las promedies" sin la
razón se lee como una preferencia de estilo.

**SIEMPRE** declarar qué significa cada estado de ausencia: `null` es hueco, un errorCode es estado,
y ninguno de los dos es cero. **NUNCA** dejar que un agente tenga que inferirlo.

---

## 7. Ruteo entre tools que compiten por la misma intención (`TASK-1784`)

**SIEMPRE** que una tool nueva conteste una pregunta que otra ya contesta, nace con (a) su
criterio de elección **dentro de la descripción de las dos**, y (b) su caso en el fixture de
selección (`scripts/mcp/tool-selection-fixture.ts`). El gate
`src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts` rompe el build si falta (b): sin él, la
superficie crece y el eval reporta una precisión alta sobre una muestra que dejó de cubrirla —
peor que no medir, porque afirma haber medido.

🔴 **NUNCA** agregar prosa de ruteo suponiendo que ayuda. Está **medido** que no: cuatro variantes
de descripción sobre 55 preguntas dieron 92.7–96.4% de precisión de tool **sin dirección**, y una
de ellas hizo regresar a `prepare_seo_grounded_queries`, una tool que nadie había tocado. Alargar
una descripción degrada la selección de sus **vecinas**, porque compite por atención con la prosa
que sí funciona. Lo que movió el número fue **corregir afirmaciones falsas**, no agregar texto.

🔴 **NUNCA** dejar que una descripción invite a elegir un mercado. La cláusula original —*"pass
market=&lt;ISO-2&gt; when the organization has more than one"*— era literalmente una instrucción de
elegir, y el modelo la obedecía justificándose con *"the operator is in Santiago"*. **Dónde está
el operador, de dónde viene la marca, en qué idioma escribe y qué target se creó primero están
CORRELACIONADOS con el mercado y ninguno lo DECLARA.** Tratar cualquiera de ellos como declaración
es `ISSUE-152`: el target de Berel midió Chile un año, 238 snapshots contra el SERP equivocado.
`resolveSeoTargetForMarket` ya se niega a elegir callado del lado del runtime; el hueco que queda
es que el agente **invente** el argumento, y el runtime lo resuelva obedientemente.

**SIEMPRE** poner una afirmación fuerte del tipo *"úsala en vez de X"* **acotada en su propio
lugar**. Sin acotar y al principio de la descripción, gana por posición sobre cualquier matiz que
llegue después.

⚠️ **Ninguna descripción le gana al nombre de su propia tool.** Está medido: *"muéstrame el
rendimiento"* enruta a `get_seo_performance` por semejanza léxica, contra lo que diga el texto. Si
la selección de una tool importa de verdad, la palanca es el **naming**, no la prosa.

🔴 **NUNCA** hacer que el eval de selección sea un gate de CI con umbral de precisión. Llama a un
modelo: cuesta y no es reproducible entre versiones, y un umbral se satisface editando
expectativas hasta poner el build en verde — que es cómo un eval deja de medir. El gate
determinista mide **cobertura de la superficie**, no precisión.

**SIEMPRE** que una tool federada cambie de descripción, el gateway la recibe **derivada**, nunca
copiada: el texto viaja en el artefacto generado y `src/mcp.ts` lo consume con
`greenhouseToolDescription(name)`. Cuando el guard empezó a mirar el texto encontró **21 de 27
federadas ya divergentes**, sirviendo entre otras cosas la instrucción que causaba `ISSUE-152`. Un
espejo a mano vuelve a divergir; uno derivado no puede. Una divergencia deliberada se declara con
razón en `GREENHOUSE_SEO_DESCRIPTION_DIVERGENCES`; el silencio no es válido.

**Fuente:** `docs/architecture/GREENHOUSE_MCP_TOOL_SELECTION_EVAL_V1.md`

---

## 8. El manual de uso viaja por el protocolo, no en la nota del handshake (`TASK-1804`)

Todo lo que un agente sabía sobre cómo OPERAR la superficie cabía en tres lugares y ninguno
servía: las `instructions` del handshake (viajan en CADA request, no pueden crecer), la
`description` de cada tool (siempre en contexto: dispara, no enseña — y §7 midió que alargarla
degrada la selección de las vecinas) y `.claude/skills/**` (escritas para un agente que opera el
REPOSITORIO: llevan ids de aplicación Entra, nombres de secretos, org ids reales y razones de
exclusión competitiva; **no son publicables**).

El segundo canal es un **manifiesto de manuales**, hermano del de tools:

- `src/mcp/greenhouse/skill-manifest.ts` declara QUÉ manuales existen (`name`, `audience`,
  `sourcePath`, `appliesTo`). Es PURO: `tool-manifest.ts` lo importa para derivar la línea de
  ruteo de las `instructions`.
- `src/mcp/greenhouse/skill-catalog.ts` es el **reader canónico**: lee `docs/mcp/skills/**`,
  toma `name` + `description` del **frontmatter** de cada `SKILL.md` (contrato de Agent Skills /
  SEP-2640) y valida la cobertura en las DOS direcciones. **NUNCA** transcribir la `description`
  al manifiesto: el frontmatter es la fuente, y copiarlo reintroduce el drift que un manifiesto
  existe para impedir.
- Tres consumidores del mismo primitive: la tool `get_greenhouse_skill`, el recurso
  `skill://efeonce/<name>/SKILL.md` y la lane `GET /api/platform/ecosystem/mcp/skills[/{name}]`.
  El gateway federado delega en la lane y **NUNCA embebe contenido** (un bundle estático en el
  gateway es una segunda fuente de verdad). El cuerpo es el archivo VERBATIM, byte-idéntico en
  los tres.

🔴 **Publicar es un acto explícito.** Manual declarado sin archivo, archivo bajo `docs/mcp/skills/`
sin entrada, frontmatter cuyo `name` no coincide, o tool gobernada (`appliesTo`) que no existe en
el manifiesto de tools → **el servidor no construye** (`createGreenhouseMcpServer` corre la
cobertura) y la lane responde 500, nunca un catálogo vacío en verde.

🔴 **NUNCA** publicar contenido interno. Ningún manual cita secretos, UUIDs (ids de app Entra,
clientes OAuth, bindings), identificadores de organización (`org-…`, `EO-ORG/SPK/SPB-…`), rutas
del repositorio (`src/`, `docs/`, `.claude/`…), ids de task/issue, el proyecto GCP, revisiones de
Cloud Run ni emails internos. **El control es el test de fuga**
(`src/mcp/greenhouse/__tests__/skill-manifest.test.ts`) que recorre todo `docs/mcp/skills/**` —
la revisión humana NO lo es. Los manuales se escriben de cero para el consumidor MCP; **NUNCA**
se sirve `.claude/skills/**` por MCP, ni filtrado.

🔴 **`audience: internal` NO EXISTE para un binding que no sea `internal`.** No aparece en el
catálogo y su detalle responde `404` anti-oráculo, **nunca `403`** (un 403 confirma que hay algo
que no se puede leer). Inexistente, no visible y nombre malformado devuelven el MISMO 404.
`audience: client` está reservado hasta que existan grants por tenant (`TASK-1631`): ningún manual
nace con ese valor.

🔴 **Los manuales viajan en el bundle como ARTEFACTO GENERADO, nunca se leen del filesystem en
runtime.** La primera versión los leía con `readFileSync` y los declaraba en
`outputFileTracingIncludes`; Vercel rechazó el build (deploy `greenhouse-oib3ykjp0`, 2026-09-02):
una ruta con includes propios deja de agruparse con las demás y la función sola pesó **397 MB**
contra un techo de 250 MB. La clase de problema es "filesystem input del runtime" y se cerró en
vez de vigilarse: `pnpm mcp:skills:generate` produce `src/mcp/greenhouse/skill-catalog.generated.json`
(mismo reader que valida la cobertura; `catalogHash` + `contentHash` por manual) y
`pnpm mcp:skills:check` —en `local:check` y en CI— falla si difiere del filesystem. El runtime
re-verifica hashes y coincidencia con el manifiesto al cargar: un artefacto viejo o editado a mano
LANZA. **NUNCA** editar `skill-catalog.generated.json` a mano; **NUNCA** reintroducir `fs` ni
`outputFileTracingIncludes` para los manuales. La lectura de filesystem vive SÓLO en
`skill-catalog-fs.ts` (generador + tests): Turbopack analiza estáticamente las lecturas de `fs` con
rutas dinámicas y, al no resolverlas, incluye el proyecto ENTERO en la función aunque el código no
corra en runtime — **NUNCA** importar ese módulo desde nada alcanzable por una ruta. El smoke del runbook MCP sigue comparando la
**cuenta EXACTA** del catálogo, nunca `≥ 1`.

**SIEMPRE** que una tool nueva comprometa presupuesto, entra al `appliesTo` de
`seo-spend-discipline` en el mismo PR: el test lo exige, y la línea de gasto de las
`instructions` sólo rutea al manual si éste gobierna a TODAS las tools que gastan (si no, conserva
el procedimiento inline — la derivación es real, no un literal). La `description` de
`get_greenhouse_skill` nombra cada manual: es la única palanca garantizada en contexto (patrón
Figma: nombrar el prerrequisito ANTES de la tool que gobierna).

**El catálogo devuelve resúmenes, nunca cuerpos.** Techo declarado: ~12 manuales antes de
particionar por dominio (estimación; se revisa al pasar de 6).

**Por qué es tool + recurso + lane y NO los métodos `skills/*` de SEP-2640 — y por qué no
"corregirlo" hacia el SEP.** Verificado 2026-09-02 contra GitHub: SEP-2640 sigue **abierto, sin
mergear** (creado 2026-04-23, último movimiento 2026-08-29) y su wire format se reescribió dos veces
en el año; ningún SDK nuestro lo implementa. Lo estable es el **formato del contenido** (frontmatter
`name`/`description` de Agent Skills), no el transporte: por eso el manual ya nace en ese formato y
se sirve por las primitivas que sí existen. **NUNCA** implementar `skills/list`/`skills/get` a mano
sobre un borrador: cuando el SEP se publique, el cambio es agregar el transporte, no reescribir el
contenido. ⚠️ De los consumidores conocidos del SEP, los tres toman **snapshot al instalar** y
ninguno relee el manual en runtime: **NUNCA** prometer que "actualizo el manual y los agentes lo
recogen"; hoy eso sólo es cierto para `get_greenhouse_skill`, que lo pide en cada llamada. Detalle:
`.claude/skills/mcp-craft/protocol-radar.md`.

**Fuente:** `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §23 ·
`docs/tasks/in-progress/TASK-1804-mcp-served-skill-manual.md`

---

## Documentación relacionada

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 (contrato de honestidad `●`/`◑`) y §7 (Full API Parity)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lanes ecosystem/app)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (gateway, scopes, federación)
- `src/lib/growth/seo/lens.ts` · `lens-coverage.ts` · `lens-surface-manifest.ts`
- `docs/architecture/GREENHOUSE_MCP_TOOL_SELECTION_EVAL_V1.md` — baseline, delta medido y gate de selección
- `src/lib/growth/seo/resolve-target.ts` — la negativa a elegir mercado callado, del lado del runtime
