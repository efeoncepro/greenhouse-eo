# Knowledge Platform — Foundation

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-06-11 por Claude (TASK-1081)
> **Última actualización:** 2026-06-12 por Codex (TASK-1090)
> **Documentación técnica:** [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md) · [GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md)

## Qué es

La **Knowledge Platform** es la capa de Greenhouse donde vive el conocimiento publicado: manuales, procedimientos, glosarios y runbooks que las personas leen para aprender a operar Greenhouse, y que Nexa usa para responder con citas (sin inventar).

La idea base: **Notion sigue siendo el lugar donde se escribe el conocimiento; Greenhouse es el lugar gobernado donde se publica, versiona y consulta.**

Esta página describe la **foundation** (TASK-1081): la base de datos donde ese conocimiento vivirá. Todavía **no** hay ingesta desde Notion, ni búsqueda, ni pantalla, ni conexión con Nexa — eso llega en tasks siguientes (TASK-1082 a 1086).

## Qué guarda (en simple)

| Cosa | Para qué sirve |
| --- | --- |
| **Fuente** (`knowledge_sources`) | De dónde viene el conocimiento (un teamspace de Notion, una colección de docs). |
| **Documento** (`knowledge_documents`) | El artículo lógico ("Cómo preguntar a Nexa", "Glosario ICO"). |
| **Versión** (`knowledge_document_versions`) | Cada vez que se publica el documento queda una foto inmutable, con su checksum. |
| **Chunk** (`knowledge_chunks`) | El documento partido en pedazos pequeños para que Nexa recupere solo lo relevante y lo cite. |
| **Run de publicación** (`knowledge_publication_runs`) | Bitácora de qué se publicó / puso en cuarentena / marcó viejo, y cuándo. No se borra. |
| **Feedback** (`knowledge_feedback`) | Opiniones ("útil", "fuente equivocada", "está viejo") para mejorar el corpus. No se borra. |

## Las dos preguntas que un documento responde por separado

Un detalle importante del diseño: **el estado de un documento y el permiso de Nexa son dos cosas distintas** (no se mezclan).

- **¿En qué etapa está el documento?** → `publication_status`: borrador → en revisión → publicado → (viejo / descontinuado). Y un estado especial, **cuarentena**, que lo bloquea para todos.
- **¿Nexa lo puede usar?** → `agentic_policy`: permitido (`agent_allowed`) o excluido (`agent_excluded`).

Por eso un documento puede estar **publicado y visible para las personas, pero fuera de Nexa** (ej. una política interna de seguridad). Y la cuarentena gana sobre todo: si un documento tiene un secreto o algo peligroso, no lo ve nadie — ni personas ni Nexa.

> Detalle técnico: las dos dimensiones son columnas ortogonales con CHECK constraints separados. Las transiciones de `publication_status` se validan en un trigger de base de datos y en el helper TS `assertValidKnowledgePublicationTransition`. Ver `src/lib/knowledge/state-machine.ts`.

## Quién puede qué (permisos)

La foundation siembra 5 permisos (capabilities) del módulo `knowledge`:

| Permiso | Para qué | Quién (MVP interno) |
| --- | --- | --- |
| `knowledge.document.read` | Leer documentos publicados | Equipo interno + admins |
| `knowledge.document.publish` | Publicar/actualizar documentos | Equipo interno + admin |
| `knowledge.source.admin` | Administrar las fuentes | Solo admin |
| `knowledge.agentic.retrieve` | Que Nexa/MCP recuperen conocimiento | Equipo interno + admin |
| `knowledge.feedback.submit` | Dejar feedback | Equipo interno + admin |

En el MVP todo es **solo interno** — los clientes todavía no ven nada de la Knowledge Platform.

## Qué NO es

- **No es** la "memoria de runtime" de los agentes (eso es la *Structured Context Layer*, `greenhouse_context`, que guarda evidencia de ejecución en JSONB). La Knowledge Platform guarda **documentos de prosa para enseñar**.
- **No es** el sync de métricas de Notion (delivery/ICO). Ese pipeline es separado.

> Detalle técnico: separación de contextos en [GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md](../../architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md) §900-906.

## Qué sigue

- **TASK-1084** — el "Knowledge Center" humano en `/knowledge`.
- **TASK-1085** — conexión de Nexa con citas.
- **TASK-1086** — recursos MCP read-only.

## Cómo se usa Knowledge en Greenhouse (TASK-1084 + TASK-1090)

La ruta `/knowledge` es una sola superficie interna con **tres lentes conectados**:

- **Humano:** busca guías publicadas, permite leerlas con metadata de vigencia/fuente/owner y deja feedback cuando algo falta o no sirve.
- **Nexa:** usa la AnswerSurface conversacional. En idle muestra solo el composer glow; al preguntar, la pregunta sube como burbuja, Nexa responde debajo, el composer baja para follow-up y las fuentes/trazabilidad quedan en el proof panel.
- **MCP:** muestra el paquete técnico/resource URI que consumen agentes, siempre desde contratos reales.

No es otra experiencia de Nexa ni un segundo Knowledge. Es una ruta única donde el usuario cambia de lente sin sentir que cambió de producto:

- La caja glow usa el mismo `NexaComposer kind='knowledgeAsk'` que el resto de la familia Nexa; en Humano busca guías y en Nexa pregunta a Nexa.
- El inspector y la AnswerSurface muestran evidencia con `NexaEvidencePanel`, el mismo panel de trazabilidad que usa Nexa cuando responde con Knowledge.
- La acción **Continuar con Nexa** sigue abriendo el Nexa flotante existente con el contexto de la guía, para que la conversación continúe sin crear un chat paralelo.
- El feedback se guarda en el mismo contrato de Knowledge (`POST /api/platform/app/knowledge/feedback`) que alimenta la mejora del corpus para humanos, Nexa y MCP.

Así, `/knowledge` responde “muéstrame y déjame revisar la fuente”, “pregúntale a Nexa con esa evidencia” y “exponlo para agentes” dentro de la misma experiencia.

## Cómo se busca el conocimiento (TASK-1083)

La búsqueda es **un solo contrato** que usan por igual las personas, Nexa y el MCP — ninguna pantalla consulta las tablas por su cuenta. Le das una pregunta y te devuelve los **fragmentos relevantes con su cita** (de qué documento y de qué sección salen), un **nivel de confianza** y la **frescura** de las fuentes.

- **Respeta las dos preguntas separadas:** una persona puede ver un documento marcado como "no usado por Nexa" (por ejemplo, el de nómina), pero **Nexa y el MCP nunca lo reciben**. Lo que queda fuera por esa regla se **cuenta** ("3 fragmentos quedaron fuera por política") sin mostrar su contenido.
- **Es honesta cuando no sabe:** si no hay una guía publicada que responda, dice "no encontré una guía publicada" en vez de inventar.
- **Entiende preguntas naturales:** es insensible a acentos (`nómina` = `nomina`) y tolera que escribas la pregunta con verbos y palabras de relleno.
- **Calidad medida:** un set de **golden questions** (preguntas con respuesta conocida) verifica que cita la fuente correcta, no cita la equivocada, responde "no sé" cuando toca, y nunca filtra a Nexa lo que no corresponde.

> Detalle técnico: el reader único vive en `src/lib/knowledge/search/`; los endpoints en `/api/platform/app/knowledge/*`. Ver la [spec de arquitectura](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md) (Delta 2026-06-12).

## Cómo entra el conocimiento (ingesta, TASK-1082)

El conocimiento no se escribe a mano en Greenhouse: se **ingiere** desde una fuente autorizada. La ingesta toma cada documento, lo parte en pedazos (chunks) con su "ruta de títulos" para poder citarlo, lo **revisa** (sanitiza) y solo entonces lo publica.

- **De dónde viene hoy:** los 15 documentos del corpus piloto son **archivos del repositorio** (manuales y docs que ya existen). Cuando se conecte un teamspace de Notion de conocimiento (TASK-1088), entrarán también desde ahí — pero el flujo es el mismo.
- **La revisión de seguridad va primero:** si un documento trae un secreto, un dato personal o una instrucción que intente "controlar" a Nexa, se pone en **cuarentena** (no se publica ni Nexa lo puede usar) hasta limpiarlo.
- **Es idempotente:** re-correr la ingesta no duplica nada; solo publica una versión nueva si el contenido cambió de verdad.
- **Es auditada:** cada corrida queda registrada (qué se publicó, qué se puso en cuarentena, qué se omitió).

> Detalle técnico: el pipeline de ingesta vive en `src/lib/knowledge/ingestion/` y `src/lib/knowledge/sanitization/`. Operar la foundation (aplicar migración, ingerir el corpus, usar los helpers): ver el [manual de uso](../../manual-de-uso/plataforma/knowledge-platform.md).

## Cómo se ve una respuesta de Nexa con Knowledge (TASK-1089)

El mockup interno `/knowledge/mockup/answer-trace` ahora muestra el patrón transversal elegido para respuestas con evidencia: estado inicial limpio con composer glow, pregunta que sube como burbuja, Nexa respondiendo con fuentes visibles y composer glow descendido debajo de la respuesta para seguir preguntando sin sentir que el usuario "salió" a otra experiencia.

El panel de trazabilidad permanece al lado en desktop y debajo en mobile con cuatro lentes:

- **Fuentes:** documentos y extractos citados.
- **Cómo llegó:** pasos humanos de intención, búsqueda, respuesta y feedback.
- **Paquete:** forma del contrato `knowledge-search.v1` que consumen agentes.
- **Revisión:** checks de calidad/golden questions.

Esta pantalla sigue siendo mockup interno y baseline visual. La promoción runtime sucede en `/knowledge`: el lente **Nexa** usa `NexaKnowledgeAnswerSurface` con contratos reales, mientras el mockup conserva la experiencia aprobada para comparación GVC.

Desde `TASK-1093`, la evidencia conversacional se normaliza antes de renderizarse: el packet `knowledge-search.v1` se adapta a `ConversationalEvidencePacket` (`nexa-evidence.v1`) y se muestra con `NexaEvidencePanel`. Esto evita que el chat de Nexa y la Answer Surface tengan cards de fuentes diferentes. La rehidratación de threads también conserva los tool-calls persistidos cuando existen; si un historial antiguo no trae evidence, mantiene el texto sin re-ejecutar herramientas.

## Qué exige production readiness (TASK-1092)

Para que Nexa Knowledge pueda prenderse en producción, no basta con que la respuesta use Knowledge internamente: la persona debe poder ver de dónde salió cada respuesta.

- Las respuestas grounded deben mostrar marcadores `[n]` en el texto y una lista de fuentes (`Fuentes: [n] = documento/sección`).
- Si Nexa recupera fragmentos pero el modelo omite esos marcadores, el runtime agrega un bloque de fuentes derivado del packet. Es una red de seguridad honesta: no inventa en qué frase iba cada cita.
- Si Knowledge no encuentra una guía (`confidence='none'`), Nexa debe decir que no encontró documentación publicada y no crear un procedimiento de la nada.
- En temas sensibles como nómina, finanzas, legal, seguridad o compromisos contractuales, Nexa debe citar y sugerir validación humana cuando corresponda.

La brecha de **modo mantenimiento** quedó clasificada como cobertura de manifest/ingesta: el manual existe en `docs/manual-de-uso/plataforma/modo-mantenimiento.md` y ahora está incluido en el corpus piloto. Eso no se resuelve ajustando ranking; requiere re-ingerir el corpus y validar QA K5 en staging.

La matriz QA operativa vive en `pnpm qa:nexa-knowledge -- --env=staging`. Production permanece apagado hasta que esa matriz pase en staging con el código desplegado y se revisen las señales de reliability del módulo Knowledge.

## Cómo se mantiene al día el conocimiento (auto-ingest, TASK-1094)

Antes, cuando alguien agregaba o editaba un artículo en Notion, el conocimiento de Nexa **no se enteraba** hasta que alguien re-corría un comando a mano. Con el auto-ingest, **se mantiene solo**:

- **Agregás un artículo** en una Wiki conectada → Nexa lo ve automáticamente (segundos).
- **Editás un artículo** → se actualiza solo.
- **Borrás un artículo** → desaparece de Nexa solo (deja de citarse).

Cómo funciona en simple: Notion **avisa** (webhook) cuando algo cambia; Greenhouse escucha ese aviso, va a buscar esa página y la actualiza en la base de conocimiento. Nexa no entra a Notion en vivo — consulta la copia ya indexada.

**Solo las Wikis/páginas autorizadas.** Un cambio en una Wiki que NO está en la lista se ignora (control de gobernanza).

**Red de seguridad honesta.** Los avisos de Notion raramente se pueden perder. Por eso hay (a) una alarma que avisa si un cambio no se pudo procesar, y (b) un comando de "reconciliación" que el operador corre para recuperar lo perdido y borrar de la base lo que ya no existe en Notion. Así nunca queda desincronizado en silencio.

> Detalle técnico: arquitectura `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12; runbook operativo `docs/operations/runbooks/notion-knowledge-webhook.md`.
