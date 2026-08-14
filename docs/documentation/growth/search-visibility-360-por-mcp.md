> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-08-06 por Claude (TASK-1645 + TASK-1647)
> **Ultima actualizacion:** 2026-08-14 por Claude (TASK-1659: intención declarada al seguir una keyword; corrección del alcance "solo lectura")
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · [EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
> **Manual de uso:** [Operar el provider Greenhouse-SEO del MCP](../../manual-de-uso/plataforma/operar-provider-greenhouse-seo-mcp.md)

# Search Visibility 360 por MCP

## Que es

Search Visibility 360 mide cómo se ve una marca en los dos internets de búsqueda: los buscadores clásicos (Google, vía el [módulo SEO](modulo-seo-search-visibility-360.md)) y los motores de respuesta de IA (ChatGPT, Claude, Perplexity, Gemini, vía el [AI Visibility Grader](ai-visibility-grader.md)).

Desde el 6 de agosto de 2026, esa capacidad **se puede consultar desde un asistente de IA** — no solo desde una pantalla del portal. Un cliente MCP (por ejemplo Claude Desktop) se conecta al punto de acceso de Efeonce y puede preguntar en lenguaje natural "¿cómo va la visibilidad de esta marca?" y recibir los mismos datos que vería un operador en el portal.

Esto es importante por una razón de diseño, no de moda: Greenhouse exige que **toda capacidad tenga contrato programático, no solo pantalla**. El módulo SEO se construyó al revés de lo habitual — primero el contrato que un agente puede operar, después las pantallas. Por eso hoy hay respuestas por MCP antes de que exista la UI del módulo.

## Como llega la pregunta hasta el dato

Hay tres piezas y cada una tiene un dueño distinto:

1. **El punto de acceso público** (`mcp.efeonce.org`) autentica a la persona con la cuenta corporativa de Microsoft. Sin credencial válida no pasa nada: una consulta anónima se rechaza.
2. **El adaptador de SEO** dentro de ese punto de acceso no sabe nada de SEO. Solo transporta la pregunta hasta Greenhouse con la identidad de servicio del gateway.
3. **Greenhouse decide y responde.** Ahí vive todo: si la organización tiene el módulo contratado, cuánto cupo le queda, qué datos existen y cuáles no.

Desde ese mismo 6 de agosto, conectarse ya no exige una identidad de servicio ni un script especial: **cualquier persona del tenant Entra de Efeonce puede conectar su propio cliente MCP estándar** (Claude Code, claude.ai o Claude Desktop) al punto de acceso, iniciar sesión con su cuenta corporativa y operar las cuatro consultas conversacionalmente. Los pasos exactos están en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md).

La consecuencia práctica: **conectar un asistente de IA no otorga ningún permiso nuevo**. Las mismas reglas que aplican a la UI aplican a la consulta por MCP, porque es literalmente la misma puerta. Si un dato no se puede ver en el portal, tampoco se puede ver desde un asistente.

## Que responde cada consulta

Las **cuatro consultas** que se explican abajo son el núcleo de lectura del módulo: ninguna dispara una medición nueva ni gasta presupuesto de proveedor, y las cuatro están federadas en el punto de acceso público (la cuarta se federó el mismo 6 de agosto, `TASK-1653`).

No son lo único que hay. El inventario creció desde entonces —hay más lecturas y, desde el 7 de agosto, **un grupo acotado de escrituras gobernadas** (ver [Seguir keywords: la escritura gobernada](#seguir-keywords-la-escritura-gobernada))—. El inventario exacto de lo que está federado en cada momento vive en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md), que se verifica contra el allowlist de paridad del gateway; este documento explica el sentido de las piezas, no lleva la cuenta.

### 1. Estado del módulo (`get_seo_entitlement`)

Responde si una organización tiene Search Visibility 360 habilitado y en qué condiciones:

| Campo | Qué significa |
|---|---|
| Tiene módulo | Si existe la asignación `seo_v2` vigente para esa organización. |
| Tier | El plano comercial: `contracted`, `trial` o `pilot`. |
| Auditorías restantes | Cuántos análisis técnicos del sitio quedan este mes. |
| Presupuesto restante | Cuántos dólares de proveedor quedan este mes. |
| Motivo de bloqueo | Vacío si todo está bien; si no, dice exactamente por qué (`no_entitlement`, `expired`, `quota_exhausted`, `budget_exhausted`). |

Es la consulta que hay que hacer **primero**. Un agente que propone "corramos una auditoría" sin mirar esto puede estar proponiendo algo que la organización no tiene contratado o para lo que ya no le queda cupo.

Esta consulta es la única que responde honestamente `no tiene módulo` en vez de decir "no existe" (ver más abajo por qué las otras dos hacen lo contrario). Tiene sentido: su propósito es justamente que alguien pueda saber si una organización está habilitada **antes** de intentar operarla.

### 2. Oportunidades de keyword (`get_seo_keyword_opportunities`)

Lista las oportunidades de "distancia corta": las consultas donde la marca **ya aparece** en Google pero un poco más abajo de donde convierte. No son keywords sugeridas ni estimadas por un proveedor — son las consultas **medidas** en la propia serie de Search Console de la marca.

Cada oportunidad trae posición ponderada, impresiones, clics estimados que se ganarían al subir, y dos marcas útiles:

- **Quick win** — la que está lo bastante cerca como para moverla con poco trabajo.
- **Canibalización** — la misma consulta traccionando más de una página del sitio. Esa pide un trabajo **distinto**: consolidar o redirigir páginas, no optimizar. No es una variante del mismo consejo.

El puntaje se expresa en **clics incrementales estimados**, no en un número abstracto, y se calcula con la curva de comportamiento de esa misma marca — cuánta gente hace clic en *ese* sitio en cada posición — no con una tabla de industria.

### 3. El cruce 360 (`get_seo_visibility_360`)

Es la lectura que da nombre al producto: cruza **posición orgánica medida** (¿te encuentra Google?) contra **citabilidad IA** (¿te cita una IA cuando responde?). Devuelve una matriz de cuatro cuadrantes, por keyword y para el dominio completo.

| Cuadrante | Google | IA | Qué significa |
|---|---|---|---|
| **dominante** | Rankea | Te cita | Visible en los dos internets. |
| **riesgo** | Rankea | **No** te cita | Tienes autoridad orgánica que la IA no está recogiendo. Es la señal comercial más fuerte hacia el AEO. |
| **oportunidad** | No rankea | Te cita | La IA ya te reconoce; falta convertir eso en posición. |
| **invisible** | No rankea | No te cita | Sin presencia en ninguno de los dos. |

**Los dos ejes nunca se promedian.** "Rankeas primero y la IA no te cita" no es un error de medición ni un dato que haya que reconciliar: es una celda de la matriz. Promediar rankeo y citabilidad produciría un número intermedio que no describe ninguna situación real y esconde exactamente la que más importa (`riesgo`).

### 4. Evolución de posiciones (`get_seo_rank_evolution`)

Es la serie temporal de **posiciones exactas por keyword**: dónde apareció el dominio en Google cada día. La fuente es el proveedor de rankings (DataForSEO), que mide la posición observada en el mercado — no una estimación. La captura corre sola una vez al día; esta consulta **solo lee** lo ya capturado.

Acepta cuatro filtros opcionales: la ventana en días (`rangeDays`), el motor (`engine`), el dispositivo (`device`: escritorio, móvil o tablet) y un subconjunto de keywords (`keywords`).

Dos reglas de lectura que un asistente está obligado a respetar:

- **`position: null` en una fecha significa "ese día el dominio no rankeó"**. Es una medición válida — el proveedor buscó y el dominio no apareció —, no un dato faltante ni un error. No se rellena ni se interpola.
- **Esta serie nunca se promedia con la de Search Console.** Miden cosas distintas: DataForSEO mide la posición exacta observada; Search Console reporta la posición ponderada por impresiones reales. Mezclarlas produce un número que no describe ninguna de las dos verdades.

**Estado de esta consulta:** está viva en el MCP interno de producción desde el 6 de agosto de 2026, con captura diaria activa, y ese mismo día quedó federada al punto de acceso público `mcp.efeonce.org` (`TASK-1653`) — un cliente del gateway ya la ve junto a las otras tres.

## Seguir keywords: la escritura gobernada

Desde el 7 de agosto de 2026 el módulo dejó de ser solo de lectura: un asistente puede **agregar keywords al set monitoreado** (`track_seo_keywords`) y **sacarlas** (`untrack_seo_keywords`).

Lo que hay que entender antes de leer nada más: **seguir una keyword no es guardar un dato, es comprometer gasto recurrente**. El write en sí no cuesta nada, pero la captura diaria de posiciones le paga al proveedor por **cada keyword vigente, en cada ciclo**, hasta que alguien la saque. Por eso:

- La lista exacta se le **propone al humano y se confirma antes** de llamar. Nunca especulativamente ni "para ver qué pasa".
- El set tiene un **techo**. Las keywords que lo exceden vuelven marcadas `capacity_exceeded` y **no quedan seguidas** — hay que reportarlas con esas palabras, no dar a entender que entraron.
- La respuesta trae un **resultado por keyword**, no un "listo". Un asistente que reporte éxito mirando solo el `ok` general puede estar describiendo un cambio que no ocurrió para la mitad de la lista.
- Solo operan desde el lado interno de Efeonce. Un conector ligado a una organización cliente puede **leer** sus oportunidades, pero no hacer crecer su propia factura.

### Con qué intención se sigue una keyword

Al seguir una keyword se puede declarar **por qué está en el set** (`TASK-1659`). Son dos cosas distintas y no se mezclan:

| Intención | Qué significa | Cómo se lee un mal resultado |
|---|---|---|
| **`target`** (objetivo) | Un compromiso acordado con el cliente: acá queremos estar. | Estar en la posición 60 **no es un fracaso**: es la distancia que falta. Es justamente la métrica del compromiso. |
| **`opportunity`** (oportunidad) | Demanda medida que se está empujando porque el dato dice que vale la pena. | Una que no avanza se puede soltar sin drama: nadie prometió nada sobre ella. |

**Las dos nunca se promedian.** Un promedio entre "lo que prometimos" y "lo que estamos explorando" produce un número que no describe ninguna de las dos conversaciones — y esconde la única que el cliente pidió.

Tres reglas que un asistente está obligado a respetar:

- **Si nadie declaró la intención, se omite.** Es la opción correcta, no un campo faltante. Adivinarla fabrica una clasificación que ninguna persona hizo, y después alguien la lee como si fuera un acuerdo con el cliente.
- **Cambiar la intención de una keyword ya seguida es un cambio real y se reporta aparte** (`intent_changed`, distinto de `already_tracked`). No consume cupo del set —cierra la etapa anterior y abre otra—, así que reclasificar sigue siendo posible incluso con el set lleno, que es cuando más falta hace. Y **conserva el historial**: queda registrado desde cuándo es objetivo, que es lo que permite después decir "es objetivo desde marzo, y en marzo estaba en la 45".
- **Las keywords que se seguían desde antes del 14 de agosto de 2026 no tienen intención declarada.** Eso significa exactamente eso: nadie la declaró. **No son oportunidades**, y presentarlas como tales inventa una decisión que nunca se tomó.

Junto a la intención puede viajar **a quién se le atribuye** esa declaración cuando el agente actúa por encargo de una persona. Los dos datos son distintos a propósito: quién ejecutó el write sigue siendo la máquina —esa es la procedencia real del gasto y así queda auditable—, y la autoría humana se registra aparte. Una autoría sin intención declarada se descarta: no hay a qué atribuirla.

## Que pasa cuando falta una lente

Esta es la regla más importante para leer una respuesta y **la que un asistente de IA está obligado a respetar**: cuando un dato no está, se dice que no está. Nunca se rellena con ceros.

Un cero significa "medimos y dio cero". Un dato ausente significa "no medimos". Confundirlos hace que alguien lea "ese mes no hubo tráfico" cuando la verdad era "ese mes no había conexión". Por eso cada respuesta puede volver con un estado explícito:

| Estado | Qué pasó | Lectura correcta |
|---|---|---|
| `disabled` | El módulo está apagado a nivel de plataforma. | No es un dato de la marca. |
| `target_not_configured` | La organización tiene el módulo, pero nadie configuró qué dominio medir. | Falta un paso de setup, no falta rendimiento. |
| `not_connected` / `token_unhealthy` | No hay conexión sana a Search Console. | La marca puede estar rankeando perfecto; simplemente no lo estamos viendo. |
| `no_data` | Hubo consulta, no hubo filas. | Ese día/ventana no trajo datos. |
| `no_seo_data` | El cruce 360 no tiene el eje de Google. | No hay cuadrante posible. No se infiere uno. |
| `no_aeo_data` | El cruce 360 no tiene el eje de IA. | Falta correr el AI Visibility Grader para esa marca. |
| `query_failed` | La consulta falló. | Es una falla, no un resultado. |

Un caso real del día de la habilitación: la propia organización Efeonce respondió `hasModule=true`, `tier=contracted` y, en el cruce 360, `no_seo_data`. Está habilitada y no tiene serie SEO todavía. Esa es la respuesta correcta — no un 360 con ceros ni un cuadrante `invisible` inventado.

## Quien puede ver que

Dos capas gobiernan el acceso, y ninguna se relaja por venir de un asistente:

- **Identidad.** El punto de acceso exige cuenta corporativa. Hoy está limitado al tenant interno de Efeonce; no hay acceso self-service de clientes.
- **Módulo por organización.** El SEO se habilita **por organización, no por rol**. Una organización tiene Search Visibility 360 cuando alguien le asignó el módulo `seo_v2` con un tier comercial.

Sobre una organización **sin** el módulo, las dos consultas de datos responden **"no existe"** en vez de "no tienes permiso". Es deliberado: un "no tienes permiso" confirmaría que la organización existe y que se llama así. Quien no tiene acceso tampoco aprende nada preguntando. Es la misma disciplina que ya usa el resto de la plataforma.

## Que NO se puede hacer por aquí

- **Nada que escriba, salvo el par gobernado de arriba.** Las consultas son de lectura: no configuran targets, no disparan auditorías, no cambian entitlements. Lo único que escribe es seguir/dejar de seguir keywords, y solo desde el lado interno, con techo, resultado por keyword y reverso.
- **Ninguna lectura cuesta dinero.** Las consultas no llaman al proveedor pagado: leen lo ya capturado. Lo que sí compromete gasto —seguir una keyword, que la mete al ciclo diario de captura— pasa por el entitlement y el techo del módulo, y por eso exige confirmación humana explícita antes de llamarse.
- **Nada fuera del alcance del conector.** Un conector ligado a una organización solo ve la suya. Pedir otra devuelve "no existe".

> Detalle técnico: adaptador del gateway en el repo hermano `efeonce-mcp` (`src/providers/greenhouse-seo.ts`) · lane de Greenhouse en [`src/lib/api-platform/resources/ecosystem-growth-seo.ts`](../../../src/lib/api-platform/resources/ecosystem-growth-seo.ts) · readers canónicos en [`src/lib/growth/seo/`](../../../src/lib/growth/seo/) · runbook operativo en [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Greenhouse-SEO.

## Relacion con las otras piezas

- El [módulo SEO](modulo-seo-search-visibility-360.md) es el motor que produce los datos que estas consultas leen.
- El [AI Visibility Grader](ai-visibility-grader.md) aporta el eje de citabilidad IA del cruce 360.
- El [Efeonce MCP Gateway](../plataforma/efeonce-mcp-gateway.md) es el punto de acceso federado; Search Visibility 360 es su segunda capacidad, después del lector de flota de Globe.
- El [MCP read-only de Greenhouse](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md) expone estas mismas consultas para uso interno del portal, sin pasar por el gateway público.
