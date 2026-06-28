> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.12
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-06-28 por Codex (TASK-1269, Fix-It Artifacts code-complete)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# AI Visibility Grader — Motor de Providers (Growth)

## Que hace

Mide como los "answer engines" de IA (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini y Google AI Overview / AI Mode via DataForSEO) representan a una marca cuando alguien les pregunta por un servicio. El objetivo es ver si la marca **aparece o no** cuando un comprador busca proveedores, que dicen de ella y a quien citan.

Esta capa es la **fundacion del motor**: corre los prompts contra los providers, guarda la evidencia cruda y deja senales de salud. Todavia **no** calcula el puntaje final ni arma el reporte publico (eso es un paso posterior).

## Conceptos

- **Surfaces (dos tipos de motor):** el grader mide dos superficies de respuesta IA distintas, con el mismo objetivo ("¿te mencionan/citan?") pero distinto canal:
  - **Answer Engines** — asistentes conversacionales donde el usuario *va* al chatbot: **ChatGPT (OpenAI), Claude (Anthropic), Perplexity, Gemini**.
  - **AI Search** — la respuesta IA *dentro* del buscador que el usuario ya usa: **Google AI Overviews / AI Mode** (a futuro Bing Copilot).
  - Se reportan separadas porque una marca puede ser fuerte en una e invisible en la otra. Los nombres van en inglés (estándar de la industria AEO/GEO, no se traducen). Detalle técnico: `normalization/contracts.ts` (`GRADER_PROVIDER_SURFACE`).
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
- `skipped`: el provider esta apagado, sin credenciales o la superficie no devolvio bloque de respuesta para esa query. En Google AI Overview / AI Mode esto se guarda como `no_ai_overview_block`, nunca como exito vacio.
- `failed` / `rate_limited`: hubo un error o limite de uso.

## Por que no consume secretos por defecto

El grader nace **apagado** (flags `GROWTH_AI_VISIBILITY_*_ENABLED` en OFF). Sin encender el flag global + el del proveedor, cada llamada se **salta limpio** (no llama a ningun proveedor, no gasta dinero). Para desarrollo local usa un "fake provider" deterministico que simula respuestas sin red.

## Como se opera hoy

Hay un primitive server-side único (`executeGraderRun`) y todos lo consumen igual:

- **Endpoint interno:** `GET/POST /api/admin/growth/ai-visibility/runs` (+ `/<runId>` para el detalle), solo para usuarios internos con la capability correspondiente. Lista corridas y dispara una nueva.
- **CLI de smoke:** `pnpm growth:ai-visibility:smoke` (ver el [manual](../../manual-de-uso/growth/ai-visibility-grader-smoke.md)).
- **A futuro:** la UI pública, el admin, Nexa/MCP, el report builder y el handoff a HubSpot consumirán el MISMO primitive — ninguno llamará a los proveedores por su cuenta.

## Estado del rollout (2026-06-27)

- **staging:** encendido para OpenAI + Anthropic + **Gemini** + **Perplexity** (corre proveedores reales; verificado). Gemini usa la última generación disponible (**Gemini 3**, `gemini-3-flash-preview` vía Vertex) porque el grader debe medir con el modelo que la gente usa hoy; el modelo es ajustable por env sin redeploy.
- **producción:** apagado — el encendido es un proceso aparte (migración + release controlado) que se hará después.
- **Perplexity:** **encendido en staging (TASK-1249).** Usa el cliente canónico `src/lib/ai/perplexity.ts` (Sonar, search-grounded). Smoke real low-volume verde (6/6 respuestas con citas). El proveedor set arch (OpenAI/Perplexity/Gemini) queda **completo**.
- **Google AI Overviews / AI Mode (surface AI Search):** **encendido + verificado en staging (TASK-1265, 2026-06-28).** Usa DataForSEO como fuente gobernada, sin scraping directo de Google. Smoke real verde end-to-end (observación `succeeded` con 27 citas en PG, ejecutada por el worker real). Está disponible en los 3 entrypoints de análisis (público / cliente / operador) por construcción. Si DataForSEO no trae bloque de AI Overview/AI Mode, la observación queda `skipped:no_ai_overview_block` (es "no apareces", no un fallo). El costo se mide por request reportado por DataForSEO. DataForSEO documenta AI Mode como English-only hoy, así que el adapter manda `language_code=en` y conserva mercado/location para segmentar. **Producción:** apagado (gated por el launch) + rotar la credencial DataForSEO antes de prod.
- **Prompt pack v2 (TASK-1249):** existe como versión seleccionable (corrige el prompt p12, que nombraba sectores y ensuciaba las marcas de control). El **default sigue siendo v1** hasta una validación real; v2 es opt-in.
- **Pesos del score:** se mantiene **V1** (decisión documentada — el set de calibración es muy chico para reajustar pesos sin sobreajustar; detalle en `GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` §Delta 2026-06-27).

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
- **Exactitud de marca (¿la IA dice la verdad de ti?):** además de medir si apareces, el sistema revisa si la IA dice cosas **factualmente equivocadas** sobre la marca — te ubica en otra categoría, te confunde con otra empresa o te atribuye algo que no es. Compara lo que dice la IA contra los datos **declarados** de la marca (categoría, competidores). Es conservador: si hay una confusión de identidad clara, el análisis **se marca para revisión humana** antes de poder publicarse (importante para clientes sensibles como bancos o aerolíneas), en vez de afirmar por su cuenta que "la IA miente". Este detalle es **solo de uso interno** — al público nunca se le muestra "la IA se equivoca de ti", solo el equipo lo revisa.
- **Señales extra:** el reporte también muestra si la IA **cita tu propio sitio** (qué porcentaje de las respuestas con fuentes te citan a ti), el **sentimiento** con que se habla de la marca, tu **posición** cuando apareces (1.º vs 5.º), y en **qué motor** apareces o no (ej. "presente en Gemini, invisible en Perplexity"). El detalle por motor es solo para uso interno; el resto es seguro para la versión pública. Si un dato no se midió, dice "sin dato" (nunca un 0 falso).
- **Dos versiones:** una **interna** completa (para ventas/admin, con presencia por motor y detalle) y una **pública segura** que nunca incluye el texto crudo de los motores ni las fuentes privadas (sólo el puntaje, los competidores top, el resumen de fuentes y los próximos pasos, con el aviso de que es un diagnóstico muestreado por IA).

Este reporte es el **insumo** de las superficies que vienen después (página pública, AI Visibility Snapshot en HubSpot, revisión en el admin). Todavía no se muestra en pantalla ni se envía a ningún lado: es la pieza de datos que esas superficies van a renderizar.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24 (TASK-1235) + §7.7/§8.4. Código: `src/lib/growth/ai-visibility/report/**`, copy `src/lib/copy/growth.ts`. Lectura: `GET /api/admin/growth/ai-visibility/runs/[runId]/report`.

## Artefactos Fix-It (qué puede aplicar el prospecto)

El diagnóstico ahora tiene una capa de entregables accionables: **Fix-It Artifacts**. Son archivos iniciales generados de forma determinista desde el reporte público, el perfil de marca y los probes técnicos/entity del sitio.

- **Qué genera:** `Organization`/`Service` JSON-LD starter, `llms.txt`, content brief AEO-ready y un entity action brief cuando hay gaps medidos en Knowledge Graph, Wikidata o Reddit/UGC.
- **Qué no hace:** no escribe en el sitio del prospecto, no crea perfiles externos, no promete rankings ni usa IA generativa para inventar copy. El output marca campos pendientes cuando faltan URLs, fuentes o perfiles oficiales.
- **Seguridad:** hereda el boundary public-safe del reporte. No incluye texto crudo de providers, prompts, accuracy findings ni reasons internos de probes.
- **Acceso:** interno por capability `growth.ai_visibility.fix_it.generate`; público por el token no enumerable del snapshot.
- **Estado:** code complete, rollout pendiente. El flag `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` está OFF/default hasta revisión copy/legal y smoke staging con un reporte real.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-28 (TASK-1269). Código: `src/lib/growth/ai-visibility/fix-it/**`. Operación: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).

## Entrega por email (el prospecto recibe su informe — TASK-1250)

Mostrar el resultado en pantalla no basta: si el prospecto cierra la pestaña, pierde su diagnóstico. Por eso, cuando el reporte queda **listo y publicable**, el sistema le **envía el informe a su correo** — un email transaccional (no marketing, no newsletter).

- **Qué recibe:** un correo claro con su **hallazgo principal** (puntuación, brecha principal y un insight prioritario en formato "qué detectamos / por qué importa / qué hacer ahora"), un **botón al informe en línea** (link seguro con expiración) y el **informe completo adjunto en PDF**.
- **De parte de quién:** el correo viene de **Efeonce** (la agencia), no del portal Greenhouse — es una superficie pública de la agencia, igual que su PDF adjunto.
- **Cuándo se envía:** automáticamente, en cuanto el análisis se publica (lo dispara la publicación del informe, nunca el solo hecho de que alguien abra el link de estado). Pantalla y email son dos caras del mismo resultado.
- **Solo con permiso:** se envía **únicamente si el lead aceptó recibirlo** (consent). Nunca a alguien sin consentimiento. El correo del lead se usa solo para esta entrega y para el CRM, **jamás se manda a los motores de IA**.
- **Un solo correo:** aunque el sistema reintente o haya dos disparos, el prospecto recibe **un único email principal** por informe (idempotencia garantizada a nivel base de datos). Un resend explícito es una acción aparte.
- **Honestidad:** si el informe es parcial (algún motor no respondió a tiempo), el correo lo dice claramente. Un informe en revisión o sin datos suficientes **no se envía**.
- **Seguro de compartir:** el adjunto es la versión **pública** del informe — nunca incluye el texto crudo de los motores, los hallazgos internos de exactitud ni datos privados.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-27 (TASK-1250). Código: `src/lib/growth/ai-visibility/public-delivery/email/**`, template `src/emails/AiVisibilityGraderReportEmail.tsx`. Evento `growth.ai_visibility.report_email_requested` → consumer `growth_ai_visibility_report_email`. **Estado: code complete, rollout pendiente** (flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` OFF; activación gated por TASK-1246). Operación: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).

## Que no hace (todavia)

- No publica nada al sitio publico ni a HubSpot.
- No muestra el reporte en una pantalla ni lo auto-publica (la superficie visual + el snapshot inmutable son tasks posteriores).
- No usa IA para escribir el reporte: el copy es plantilla determinista (la narrativa asistida por LLM es un follow-up).
- No aplica automáticamente los Fix-It Artifacts: sólo los entrega para revisión/aplicación humana.
- No mezcla datos de clientes: V1 es interno/pre-tenant.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
