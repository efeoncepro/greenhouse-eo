> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.7
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-06-24 por Claude (TASK-1236, tendencia del reporte)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# AI Visibility Grader — Motor de Providers (Growth)

## Que hace

Mide como los "answer engines" de IA (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini) representan a una marca cuando alguien les pregunta por un servicio. El objetivo es ver si la marca **aparece o no** cuando un comprador busca proveedores, que dicen de ella y a quien citan.

Esta capa es la **fundacion del motor**: corre los prompts contra los providers, guarda la evidencia cruda y deja senales de salud. Todavia **no** calcula el puntaje final ni arma el reporte publico (eso es un paso posterior).

## Conceptos

- **Run (corrida):** una ejecucion del grader para una marca, en un modo (`light` barato / `full` completo / `internal_audit` interno).
- **Observacion:** el resultado de una pregunta a un provider. Guarda un extracto de la respuesta, las citas (sitios que el motor referencio), tokens usados, latencia y estado.
- **Evidencia ≠ verdad:** lo que dice un provider es un dato observado, no un hecho de negocio. El puntaje y el reporte se derivan despues, con reglas versionadas.

## Estados de una corrida

| Estado | Significa |
|---|---|
| `pending` / `running` | en preparacion / ejecutando |
| `succeeded` | todas las observaciones salieron bien |
| `partial` | algunas salieron bien y otras se saltaron o fallaron (honesto: no se infla a "exito") |
| `failed` | ninguna observacion exitosa |
| `skipped` | no se ejecuto nada (grader apagado o sin proveedores configurados) |

## Estados de una observacion

- `succeeded`: el provider respondio.
- `skipped`: el provider esta apagado o sin credenciales (esperado mientras el grader este OFF).
- `failed` / `rate_limited`: hubo un error o limite de uso.

## Por que no consume secretos por defecto

El grader nace **apagado** (flags `GROWTH_AI_VISIBILITY_*_ENABLED` en OFF). Sin encender el flag global + el del proveedor, cada llamada se **salta limpio** (no llama a ningun proveedor, no gasta dinero). Para desarrollo local usa un "fake provider" deterministico que simula respuestas sin red.

## Como se opera hoy

Hay un primitive server-side único (`executeGraderRun`) y todos lo consumen igual:

- **Endpoint interno:** `GET/POST /api/admin/growth/ai-visibility/runs` (+ `/<runId>` para el detalle), solo para usuarios internos con la capability correspondiente. Lista corridas y dispara una nueva.
- **CLI de smoke:** `pnpm growth:ai-visibility:smoke` (ver el [manual](../../manual-de-uso/growth/ai-visibility-grader-smoke.md)).
- **A futuro:** la UI pública, el admin, Nexa/MCP, el report builder y el handoff a HubSpot consumirán el MISMO primitive — ninguno llamará a los proveedores por su cuenta.

## Estado del rollout (2026-06-24)

- **staging:** encendido para OpenAI + Anthropic + **Gemini** (corre proveedores reales; verificado). Gemini usa la última generación disponible (**Gemini 3**, `gemini-3-flash-preview` vía Vertex) porque el grader debe medir con el modelo que la gente usa hoy; el modelo es ajustable por env sin redeploy.
- **producción:** apagado — el encendido es un proceso aparte (migración + release controlado) que se hará después.
- **Perplexity:** apagado hasta tener credenciales (no tiene cliente con grounding aún).

## Del dato al puntaje (findings y score — TASK-1227)

Las observaciones crudas no son producto. El motor las convierte en:

- **Findings normalizados:** una lectura comparable por observación (¿la marca aparece? ¿por su dominio o por un homónimo? ¿qué competidores? ¿qué citas?). Es **determinista-first**: usa señales estructuradas (dominios de citas) y deja en "desconocido" lo que no puede afirmar; las señales de prosa (sentimiento, deriva de mensaje) las llena un paso de IA opcional (apagado por defecto).
- **Score (7 dimensiones):** AI Visibility, Entity Clarity, Category Ownership, Competitive Share of Voice, Citation Quality, Message Alignment y Revenue Intent Coverage. El puntaje es **determinista, versionado y reproducible** — ningún modelo de IA lo asigna; se calcula con reglas desde los findings. Una dimensión sin evidencia queda en "null" (no se inventa 0 ni 100).
- **Compuertas de seguridad:** si no hay evidencia mínima → `insufficient_data` (nunca un puntaje falso). Si hay lenguaje riesgoso/difamatorio o sentimiento negativo poco confiable → `review_required` (revisión humana). La auto-publicación está apagada por diseño en esta etapa.

Ejemplo real (smoke): Efeonce obtuvo score ~26 con **AI Visibility = 0** — refleja el hallazgo del spike: invisible en descubrimiento por IA.

## Cómo se ejecuta un análisis (ejecución async — TASK-1234)

Un análisis (run) consulta varios motores de IA con varias preguntas. Con modelos lentos
(Gemini 3 ≈ 1 minuto por pregunta) y varios proveedores, un análisis completo puede tardar
varios minutos — demasiado para responderlo "en el momento" dentro de una página web.

Por eso el análisis se ejecuta **en segundo plano**:

- Cuando pides un análisis, el sistema lo **encola** y responde al instante con un identificador. No te quedas esperando.
- Un **trabajador en segundo plano** (Cloud Run) toma el análisis encolado y lo ejecuta sin límite de tiempo, guardando cada respuesta **a medida que llega** (no todas juntas al final). Así, si algo falla a mitad de camino, lo ya consultado **no se pierde**.
- Consultas el avance/estado del análisis cuando quieras (el detalle del run muestra cuántas respuestas lleva y si terminó).
- Si un análisis quedara "colgado" por una caída, el sistema lo **detecta y lo cierra** con la evidencia que alcanzó a juntar (nunca queda corriendo para siempre).

Esto reemplaza la ejecución "en el momento" que sólo alcanzaba para análisis chicos (un solo
motor). Es un cambio de plomería: el resultado y el puntaje son los mismos.

**Ya está activo en el ambiente de pruebas (staging):** se corrió un análisis completo real con
OpenAI + Anthropic + Gemini 3 que tardó unos 12 minutos y terminó sin cortarse (antes se moría).
En producción todavía no está prendido (va por su proceso aparte).

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24 (TASK-1234). Operación/rollout: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).

## El reporte (qué le mostramos al prospecto)

Una vez que un análisis tiene puntaje, el sistema arma un **reporte** que traduce los números en una historia accionable. NO inventa nada: es una **derivación directa** del puntaje y la evidencia ya guardados — el mismo análisis siempre produce el mismo reporte.

- **Titular (headline):** el problema dominante, con forma de KPI factual (ej. "AI Visibility 0/100"), nunca alarmista.
- **Hallazgos (3-5):** cada uno con su severidad nombrada (Crítico/Atención/Óptimo/Sin dato), el número **con contexto** (nunca un número suelto) y un verbo de acción.
- **Plan priorizado:** las recomendaciones salen **ordenadas por impacto** (qué hacer primero), no como lista plana. La de mayor impacto es el "gap principal" y define el siguiente movimiento comercial.
- **Honestidad:** una dimensión **sin evidencia** se muestra como "sin dato" (no como 0). Un 0 medido sí es un problema real. Si faltó cobertura o hay lenguaje sensible, el reporte lo dice con su razón y próximo paso, sin fingir precisión.
- **Tendencia (vs análisis anterior):** si la marca ya tiene un análisis previo comparable, el reporte muestra cuánto **subió o bajó** cada dimensión y el puntaje global desde la última vez (la visibilidad en IA se mide por tendencia, no por una foto). Si es el primer análisis dice "primer análisis"; si el anterior usó otra versión de preguntas, lo marca como "no comparable" en vez de inventar un cambio.
- **Dos versiones:** una **interna** completa (para ventas/admin, con presencia por motor y detalle) y una **pública segura** que nunca incluye el texto crudo de los motores ni las fuentes privadas (sólo el puntaje, los competidores top, el resumen de fuentes y los próximos pasos, con el aviso de que es un diagnóstico muestreado por IA).

Este reporte es el **insumo** de las superficies que vienen después (página pública, AI Visibility Snapshot en HubSpot, revisión en el admin). Todavía no se muestra en pantalla ni se envía a ningún lado: es la pieza de datos que esas superficies van a renderizar.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24 (TASK-1235) + §7.7/§8.4. Código: `src/lib/growth/ai-visibility/report/**`, copy `src/lib/copy/growth.ts`. Lectura: `GET /api/admin/growth/ai-visibility/runs/[runId]/report`.

## Que no hace (todavia)

- No publica nada al sitio publico ni a HubSpot.
- No muestra el reporte en una pantalla ni lo auto-publica (la superficie visual + el snapshot inmutable son tasks posteriores).
- No usa IA para escribir el reporte: el copy es plantilla determinista (la narrativa asistida por LLM es un follow-up).
- No mezcla datos de clientes: V1 es interno/pre-tenant.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
