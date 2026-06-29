> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.15
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-06-29 por Codex (auditoria DB/codebase/manual del grader)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# AI Visibility Grader — Motor de Providers (Growth)

## Que hace

Mide como los "answer engines" de IA (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini y Google AI Overview / AI Mode via DataForSEO) representan a una marca cuando alguien les pregunta por un servicio. El objetivo es ver si la marca **aparece o no** cuando un comprador busca proveedores, que dicen de ella y a quien citan.

El grader ya es una capacidad completa de diagnostico y monitoreo: corre prompts contra providers, guarda evidencia cruda, normaliza findings, calcula score, arma reporte interno/publico, publica snapshots seguros, orquesta email/HubSpot cuando corresponde, ejecuta probes tecnicos/entity del sitio y puede re-gradear perfiles de cliente opt-in en el tiempo. La evidencia sigue siendo muestral y asistida por IA: sirve para decision comercial y priorizacion AEO, no como verdad absoluta del negocio.

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

Hay primitives server-side gobernados y todos los entrypoints consumen esos caminos, no adapters paralelos:

- **Endpoint interno:** `GET/POST /api/admin/growth/ai-visibility/runs` (+ `/<runId>` para el detalle), solo para usuarios internos con la capability correspondiente. Lista corridas y dispara una nueva.
- **Endpoint operador:** `POST /api/admin/growth/ai-visibility/operator-run` permite a Growth/AM correr un diagnostico sobre una organizacion/prospecto con costo atribuido a ventas.
- **Endpoint cliente:** `POST /api/client-portal/growth/ai-visibility/run` existe para runs gobernados por entitlement del modulo `ai_visibility_v1`; hoy sigue apagado por flags de portal/trial.
- **Intake publico:** `POST /api/public/growth/ai-visibility/run` acepta lead consentido, captcha y abuse/cost guard; puede usar el motor Growth Forms. El email/PII nunca viaja a providers.
- **Status/reporte publico:** `GET /api/public/growth/ai-visibility/run/[handle]` usa `poll_token` o `submissionId` no enumerable; `GET /api/public/growth/ai-visibility/report/[token]` lee snapshots inmutables.
- **Worker async:** Cloud Run `ops-worker` drena runs (`/growth/grader/drain`), entrega email/HubSpot via outbox/reactive consumers y ejecuta re-grade recurrente (`/growth/grader/regrade`).
- **CLI de smoke:** `pnpm growth:ai-visibility:smoke` (ver el [manual](../../manual-de-uso/growth/ai-visibility-grader-smoke.md)).
- **UI/report surfaces:** la pantalla publica, el portal cliente, PDF/email y artefactos Fix-It leen DTOs public-safe/client-safe; ninguno llama proveedores por su cuenta.

## Estado del rollout (2026-06-29)

- **staging:** grader encendido. El worker efectivo (`ops-worker-00418-2m6`) tiene OpenAI + Anthropic + Perplexity + Gemini + Google AI Overview + probes + entity probes + email + HubSpot + re-grade encendidos. Gemini usa **Gemini 3** (`gemini-3-flash-preview` vía Vertex) y el modelo es ajustable por env.
- **producción:** apagado — el encendido es un proceso aparte (migración + release controlado) que se hará después.
- **Perplexity:** encendido en el ops-worker de staging desde el 2026-06-29 (`GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED=true`, revision `ops-worker-00418-2m6`). `services/ops-worker/deploy.sh` queda persistido con default staging ON / production OFF, para que futuros redeploys no lo apaguen. Falta un smoke async low-volume post-flip para capturar una observation nueva del worker.
- **Google AI Overviews / AI Mode (surface AI Search):** **encendido + verificado en staging (TASK-1265, 2026-06-28).** Usa DataForSEO como fuente gobernada, sin scraping directo de Google. Smoke real verde end-to-end (observación `succeeded` con 27 citas en PG, ejecutada por el worker real). Está disponible en los 3 entrypoints de análisis (público / cliente / operador) por construcción. Si DataForSEO no trae bloque de AI Overview/AI Mode, la observación queda `skipped:no_ai_overview_block` (es "no apareces", no un fallo). El costo se mide por request reportado por DataForSEO. DataForSEO documenta AI Mode como English-only hoy, así que el adapter manda `language_code=en` y conserva mercado/location para segmentar. **Producción:** apagado (gated por el launch) + rotar la credencial DataForSEO antes de prod.
- **DB staging/dev auditada:** 24 runs, 266 provider observations, 60 findings, 10 scores, 8 reports, 7 reviews, 23 probe results, 1 lead y 1 email dispatch. No hay perfiles org-bound opt-in para re-grade (`opt_in_profiles=0`, `due_profiles=0`).
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

## Re-grade recurrente (monitoreo AEO en el tiempo — TASK-1270)

El grader ya no sirve solo como diagnostico puntual. Para clientes con AEO contratado, Greenhouse puede volver a correr el analisis en una cadencia gobernada y comparar el resultado contra corridas anteriores. Eso convierte el diagnostico en **monitoreo recurrente de Share of Voice / AI Visibility**.

- **A quien aplica:** solo perfiles de cliente con `organization_id`, modulo `ai_visibility_v1` contratado y opt-in explicito (`recurring_regrade_enabled=true`). Los leads del lead magnet siguen siendo one-shot salvo upgrade/consentimiento.
- **Como corre:** Cloud Scheduler llama al ops-worker (`POST /growth/grader/regrade`) y el worker solo encola runs `full`; la ejecucion real la toma el worker async existente. No hay Vercel cron ni pipeline paralelo.
- **Cadencia:** default mensual (`monthly`), configurable por perfil (`weekly|monthly`) cuando exista una superficie gobernada para administrarlo.
- **Control de costo:** batch pequeno, idempotencia por ventana de cadencia y budget mensual (`GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD`). Si no hay presupuesto o no hay perfiles due, el job termina sin gastar.
- **Que actualiza:** crea un nuevo run comparable. El trend del reporte se deriva desde el historico existente; no se escribe una tabla nueva de tendencia.
- **Estado actual:** staging/develop esta encendido (`GROWTH_AI_VISIBILITY_REGRADE_ENABLED=true`) y el Scheduler `ops-growth-grader-regrade` esta habilitado diario a las 08:00 America/Santiago. Produccion sigue apagado/pausado.

La verificacion de staging hecha el 2026-06-29 fue segura y sin costo: el scheduler corrio, pero no habia perfiles opt-in/due (`claimed=0 enqueued=0 failed=0 skipped=no_due_profiles`). Falta el E2E con un perfil contratado opt-in que cree un run recurrente y llegue a estado terminal.

> Detalle tecnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-29 (TASK-1270). Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md#re-grade-recurrente--scheduler-task-1270).

## Entrega publica y review gate

El grader separa el write-side del read-side:

- **Finalizer:** cuando el worker termina un run, `finalizeRunDelivery` decide si el resultado queda `ready`, `in_review` o `unavailable`.
- **Snapshot publico:** si el resultado es publicable, `grader_reports` guarda un `PublicGraderReport` inmutable con token no enumerable. Re-publicar el mismo estado devuelve el mismo snapshot; no muta el reporte.
- **Review humano:** `review_required` nunca se auto-publica. Un reviewer interno aprueba o rechaza; la aprobación publica el snapshot y libera el poll publico. `insufficient_data` nunca es publicable.
- **Status publico:** el lead ve `queued`, `processing`, `ready`, `in_review` o `unavailable`; nunca ve PII, texto crudo de providers ni reasons internos.
- **HubSpot/email:** se disparan write-side al publicar/solicitar entrega, no por abrir el link.

## El reporte (qué le mostramos al prospecto)

Una vez que un análisis tiene puntaje, el sistema arma un **reporte** que traduce los números en una historia accionable. NO inventa nada: es una **derivación directa** del puntaje y la evidencia ya guardados — el mismo análisis siempre produce el mismo reporte.

- **Titular (headline):** el problema dominante, con forma de KPI factual (ej. "AI Visibility 0/100"), nunca alarmista.
- **Hallazgos (3-5):** cada uno con su severidad nombrada (Crítico/Atención/Óptimo/Sin dato), el número **con contexto** (nunca un número suelto) y un verbo de acción.
- **Plan priorizado:** las recomendaciones salen **ordenadas por impacto** (qué hacer primero), no como lista plana. La de mayor impacto es el "gap principal" y define el siguiente movimiento comercial.
- **Honestidad:** una dimensión **sin evidencia** se muestra como "sin dato" (no como 0). Un 0 medido sí es un problema real. Si faltó cobertura o hay lenguaje sensible, el reporte lo dice con su razón y próximo paso, sin fingir precisión.
- **Tendencia (vs análisis anterior):** si la marca ya tiene un análisis previo comparable, el reporte muestra cuánto **subió o bajó** cada dimensión y el puntaje global desde la última vez (la visibilidad en IA se mide por tendencia, no por una foto). Si es el primer análisis dice "primer análisis"; si el anterior usó otra versión de preguntas, lo marca como "no comparable" en vez de inventar un cambio.
- **Exactitud de marca (¿la IA dice la verdad de ti?):** además de medir si apareces, el sistema revisa si la IA dice cosas **factualmente equivocadas** sobre la marca — te ubica en otra categoría, te confunde con otra empresa o te atribuye algo que no es. Compara lo que dice la IA contra los datos **declarados** de la marca (categoría, competidores). Es conservador: si hay una confusión de identidad clara, el análisis **se marca para revisión humana** antes de poder publicarse (importante para clientes sensibles como bancos o aerolíneas), en vez de afirmar por su cuenta que "la IA miente". Este detalle es **solo de uso interno** — al público nunca se le muestra "la IA se equivoca de ti", solo el equipo lo revisa.
- **Señales extra:** el reporte también muestra si la IA **cita tu propio sitio** (qué porcentaje de las respuestas con fuentes te citan a ti), el **sentimiento** con que se habla de la marca, tu **posición** cuando apareces, tendencia vs run anterior, taxonomía de categoría, breakdown seguro de citas y **presencia por motor** (`providerPresence`, conteos public-safe). Lo que no viaja al público es el texto crudo, prompts, `providerFindings`, accuracy findings, reasons internos ni dominios crudos no resumidos.
- **Readiness del sitio:** si los probes corrieron, el reporte agrega ejes side-by-side de readiness estructural, agentic y entity. No se mezclan con el score de percepción.
- **Dos versiones:** una **interna** completa (para ventas/admin, con presencia por motor, reasons y detalle operacional) y una **pública segura** que conserva score, hallazgos, competidores top, presencia por motor agregada, resumen de fuentes/readiness y próximos pasos, con el aviso de que es un diagnóstico muestreado por IA.

Este reporte ya alimenta el snapshot público, PDF/email, HubSpot y surfaces cliente/admin. La UI pública/portal puede evolucionar, pero el contrato de datos ya existe y se gobierna desde `src/lib/growth/ai-visibility/report/**`.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24 (TASK-1235) + §7.7/§8.4. Código: `src/lib/growth/ai-visibility/report/**`, copy `src/lib/copy/growth.ts`. Lectura: `GET /api/admin/growth/ai-visibility/runs/[runId]/report`.

## Artefactos Fix-It (qué puede aplicar el prospecto)

El diagnóstico ahora tiene una capa de entregables accionables: **Fix-It Artifacts**. Son archivos iniciales generados de forma determinista desde el reporte público, el perfil de marca y los probes técnicos/entity del sitio.

- **Qué genera:** `Organization`/`Service` JSON-LD starter, `llms.txt`, content brief AEO-ready y un entity action brief cuando hay gaps medidos en Knowledge Graph, Wikidata o Reddit/UGC.
- **Qué no hace:** no escribe en el sitio del prospecto, no crea perfiles externos, no promete rankings ni usa IA generativa para inventar copy. El output marca campos pendientes cuando faltan URLs, fuentes o perfiles oficiales.
- **Seguridad:** hereda el boundary public-safe del reporte. No incluye texto crudo de providers, prompts, accuracy findings ni reasons internos de probes.
- **Acceso:** interno por capability `growth.ai_visibility.fix_it.generate`; público por el token no enumerable del snapshot.
- **Estado:** staging tiene `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` encendido en Vercel y producción sigue OFF. Pendiente: smoke funcional por token público y run admin con reporte real + revisión copy/legal antes de prod.

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

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-27 (TASK-1250). Código: `src/lib/growth/ai-visibility/public-delivery/email/**`, template `src/emails/AiVisibilityGraderReportEmail.tsx`. Evento `growth.ai_visibility.report_email_requested` → consumer `growth_ai_visibility_report_email`. **Estado:** staging ON en worker + Vercel y smoke real ya dejó 1 dispatch enviado; producción OFF/gated por TASK-1246. Operación: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).

## Límites actuales

- No usa IA para escribir el score ni la narrativa central del reporte: el score y el reporte son deterministas/versionados; la extracción LLM opcional solo enriquece campos acotados y está OFF por defecto.
- No aplica automáticamente los Fix-It Artifacts: sólo los entrega para revisión/aplicación humana.
- No habilita todavía runs de portal/trial en producción; los flags `PORTAL_RUN` y `TRIAL` siguen OFF.
- No tiene re-grade E2E con cliente real opt-in: el scheduler está ON en staging, pero la DB auditada no tiene perfiles due/opt-in.
- No debe tratar Perplexity como verificado post-flip hasta correr un smoke async low-volume en `ops-worker-00418-2m6` o posterior.
- No debe prender producción sin release control plane, migraciones/capabilities, rotación de credenciales expuestas y sign-off legal/comercial.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
