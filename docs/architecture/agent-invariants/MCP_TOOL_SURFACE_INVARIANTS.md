# MCP Tool Surface — invariantes operativos para agentes

> **Tipo de documento:** Companion de invariantes (load-on-demand)
> **Creado:** 2026-08-29 por TASK-1785
> **Compartido con:** `TASK-1784` (ruteo de selección entre tools), `TASK-1780` (manifiesto canónico de tools)
> **Cargar al tocar:** `src/mcp/greenhouse/**`, `src/lib/api-platform/resources/ecosystem-*`, o cualquier reader cuyo DTO cruce a una tool.

Cargar este doc al agregar, modificar o federar una tool MCP; al escribir la descripción de una
tool; o al cambiar la forma de un DTO que cruza el lane ecosystem.

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

---

## 5. Federar es parte de "listo"

Una tool interna que no se federa **ni se excluye con razón escrita** es drift. El guard bidireccional
del gateway (`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`) lo pone rojo; el protocolo
completo vive en `efeonce-mcp/AGENTS.md`.

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

## Documentación relacionada

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 (contrato de honestidad `●`/`◑`) y §7 (Full API Parity)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lanes ecosystem/app)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (gateway, scopes, federación)
- `src/lib/growth/seo/lens.ts` · `lens-coverage.ts` · `lens-surface-manifest.ts`
