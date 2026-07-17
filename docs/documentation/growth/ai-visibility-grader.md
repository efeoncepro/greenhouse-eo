> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.21
> **Creado:** 2026-06-24 por Claude (TASK-1226)
> **Ultima actualizacion:** 2026-07-04 por Codex (TASK-1331 — reporte público final + view facts server-side)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# AI Visibility Grader — Motor de Providers (Growth)

## Que hace

Mide como los "answer engines" de IA (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Gemini y Google AI Overview / AI Mode via DataForSEO) representan a una marca cuando alguien les pregunta por un servicio. El objetivo es ver si la marca **aparece o no** cuando un comprador busca proveedores, que dicen de ella y a quien citan.

El grader ya es una capacidad completa de diagnostico y monitoreo: corre prompts contra providers, guarda evidencia cruda, normaliza findings, calcula score, arma reporte interno/publico, publica snapshots seguros, orquesta email/HubSpot cuando corresponde, ejecuta probes tecnicos/entity del sitio y puede re-gradear perfiles de cliente opt-in en el tiempo. La evidencia sigue siendo muestral y asistida por IA: sirve para decision comercial y priorizacion AEO, no como verdad absoluta del negocio.

## Relación con la Radiografía AEO

El Grader y la Radiografía cumplen trabajos distintos dentro del motion SEO/AEO:

| Activo | Qué responde | Cuándo se usa |
|---|---|---|
| **AI Visibility Grader** | "¿Cómo ve la IA a esta marca y dónde están sus huecos?" | Diagnóstico, lead magnet, operator send, HubSpot, priorización |
| **Radiografía AEO** | "¿Cómo se ve un trabajo que tapa uno de esos huecos?" | Educación, demo en vivo, licitación, propuesta, QBR |

La cadena comercial correcta es **diagnóstico → demostración → propuesta → operación**. Un informe del Grader puede abrir la conversación; la Radiografía la vuelve tangible cuando el comprador necesita ver el método y no solo un score.

Referencia comercial: [Usar la Radiografía AEO en venta y educación](../../manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md).

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

## Experiencia del cliente en el portal — tiers + trial PLG (TASK-1278)

Cuando un cliente entra a **AEO** dentro del portal (`/aeo`), lo que ve depende de **qué tiene contratado su organización**, no de su rol. La decisión se resuelve del lado del servidor con el entitlement del módulo `ai_visibility_v1` (TASK-1277):

- **Sin AEO contratado** → ve un **teaser gratis**: "Descubre cómo te ve la IA", con el valor del producto y un botón "Habla con tu equipo". **No corre el motor** (costo cero); es una invitación, no una puerta cerrada.
- **AEO contratado** → ve su **informe completo** (el mismo workbench de visibilidad), sin contador de cupo. Su re-medición es el monitoreo recurrente, no un botón.
- **Prueba (trial) o piloto** → ve un banner "**Te quedan N de M revisiones este mes**" con la fecha de renovación, y un botón "**Generar revisión**" para correr su análisis cuando le queda cupo. Cuando se le agotan, el banner cambia a "**Usaste tus revisiones de este mes**" + "Activar AEO recurrente" — es un **upsell, no un error**.

El botón "Generar revisión" siempre pasa por el mismo control gobernado del servidor (el cliente nunca dispara el motor directo). Mientras la revisión se prepara, la pantalla muestra un estado "se está preparando" y se actualiza sola cuando el informe llega. Nunca se le muestra al cliente el costo ni los detalles internos del motor.

> Detalle técnico: ruta `src/app/(dashboard)/aeo/page.tsx` (resuelve por `resolveAeoEntitlement`); componentes en `src/views/greenhouse/growth/ai-visibility/client/` (`AeoTierBanner`, `AeoRunCta`, `AeoLockedCard`); command de portal `requestGraderRunForOrganization` (TASK-1277). Spec: `docs/tasks/complete/TASK-1278-aeo-client-tiering-plg-trial-ux.md`.

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

**Delta TASK-1328 (code complete local, rollout pendiente):** el modelo público del informe ahora está preparado para mostrar el diagnóstico completo de señales reales: denominadores por motor (`present/resolved`), fuentes citadas por dominio, categoría solo cuando hay datos medidos, provenance/metodología y readiness agentic como `Be Actionable`. La publicación de snapshots nuevos reúne probes antes de finalizar la entrega; los snapshots ya congelados siguen `new-runs-only` por defecto salvo republish/version bump gobernado. El hub `efeonce-think` debe renderizar estas secciones desde `model` sin re-derivar scoring ni exponer prompts, texto crudo, URLs completas o reasons internos.

**Delta TASK-1331 (released 2026-07-04):** el informe público final ya corre sobre el contrato `modelVersion=1.1.0`. Greenhouse agrega `model.viewFacts` como namespace aditivo y server-derived para engine coverage / Share of Model, totales globales de citabilidad, benchmark competitivo, sentimiento, readiness, highlights de dimensiones y share facts. `citationSourceBreakdown.classificationTotals` conserva totales globales aunque el render muestre top-N, y `levels[].isNext` mueve al backend la decisión de "Empieza aquí". El hub `efeonce-think` queda como renderer tonto: puede tener fallbacks de compatibilidad para snapshots viejos, pero no debe volver a calcular semántica de negocio localmente.

Regla dura de promoción mockup → reporte final: si una pieza visible del informe requiere interpretar evidencia, comparar competidores, clasificar citas, resumir readiness o decidir un next step, el dato debe venir de Greenhouse en `ReportArtifactModel`/`model.viewFacts`. Think sólo pinta, formatea y degrada honestamente. No se tocó scoring, pesos, probes, normalizer, provider adapters ni `executeClaimedGraderRun`.

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
- **A dónde lleva el botón (TASK-1324):** el enlace abre el informe en el hub público **`think.efeoncepro.com/brand-visibility/r/<token>`** (no en el portal Greenhouse — el render vive en el hub `efeonce-think`). El **mismo enlace** se guarda como `report_url` en HubSpot. Antes apuntaba a una ruta del portal que daba **404**; hoy resuelve al informe real, y los correos ya enviados con el link viejo se recuperan con un redirect automático.
- **De parte de quién:** el correo viene de **Efeonce** (la agencia), no del portal Greenhouse — es una superficie pública de la agencia, igual que su PDF adjunto.
- **Cuándo se envía:** automáticamente, en cuanto el análisis se publica (lo dispara la publicación del informe, nunca el solo hecho de que alguien abra el link de estado). Pantalla y email son dos caras del mismo resultado.
- **Solo con permiso:** se envía **únicamente si el lead aceptó recibirlo** (consent). Nunca a alguien sin consentimiento. El correo del lead se usa solo para esta entrega y para el CRM, **jamás se manda a los motores de IA**.
- **Un solo correo:** aunque el sistema reintente o haya dos disparos, el prospecto recibe **un único email principal** por informe (idempotencia garantizada a nivel base de datos). Un resend explícito es una acción aparte.
- **Honestidad:** si el informe es parcial (algún motor no respondió a tiempo), el correo lo dice claramente. Un informe en revisión o sin datos suficientes **no se envía**.
- **Seguro de compartir:** el adjunto es la versión **pública** del informe — nunca incluye el texto crudo de los motores, los hallazgos internos de exactitud ni datos privados.

> Detalle técnico: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-27 (TASK-1250). Código: `src/lib/growth/ai-visibility/public-delivery/email/**`, template `src/emails/AiVisibilityGraderReportEmail.tsx`. Evento `growth.ai_visibility.report_email_requested` → consumer `growth_ai_visibility_report_email`. **Estado:** staging ON en worker + Vercel y smoke real ya dejó 1 dispatch enviado; producción OFF/gated por TASK-1246. Operación: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
>
> Destino del enlace (TASK-1324, released 2026-07-03): fuente única `buildPublicReportUrl` en `src/lib/growth/ai-visibility/hubspot/report-link.ts` → `${PUBLIC_GRADER_HUB_URL || 'https://think.efeoncepro.com'}/brand-visibility/r/<token>` (email + HubSpot `report_url` heredan). Redirect puente 307 del path viejo `/grader/r/<token>` en `next.config.ts`. ADR del render headless: `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`.

## Cross-sell del operador — enviar informe + crear Lead (TASK-1279)

Cuando un operador de Efeonce (Growth/Account) corre el grader sobre un **cliente** o un **prospecto** (una empresa que ya existe en HubSpot) y ve la brecha frente a sus competidores, puede **enviar el informe** a la persona de contacto y, al mismo tiempo, **abrir un Lead en HubSpot** de forma trazable. Es el cierre comercial del diagnóstico: correr → mostrar la situación → enviar → registrar el interés.

**Qué crea: un Lead, NO un Negocio (Deal).** El diagnóstico es una conversación temprana (tope del embudo). Por eso se crea un **Lead** (asociado al Contacto y/o la Empresa), nunca un Deal. Un Deal es un momento comercial más avanzado (una oportunidad ya calificada); crearlo en esta etapa ensuciaría el pipeline. El Lead nace con un tipo según la relación: **expansión** (cliente actual) o **nuevo negocio** (prospecto).

**Regla de consentimiento (nunca en frío).** El envío a un **prospecto** solo se permite por **interés legítimo** y con un **consentimiento capturado** en una conversación previa (se registra una referencia al consentimiento, nunca el dato crudo). Sin ese consentimiento el sistema **rechaza el envío**. A un **cliente con relación activa** se le envía como parte del servicio. Todo envío queda en una bitácora que no se borra (quién envió, a quién, qué informe, con qué base legal, qué Lead se creó).

**Qué recibe el contacto.** El mismo informe público-seguro del lead magnet (PDF con marca Efeonce), sin datos internos del motor. El resultado del análisis ("aparece / no aparece / no verificado") queda registrado en la Empresa dentro de HubSpot.

**Cómo se opera.** Hoy, vía el contrato programático gobernado (`POST /api/admin/growth/ai-visibility/runs/[runId]/send-lead`) y, a futuro, desde la vista de operador y desde Nexa (con confirmación humana). Requiere que el informe del análisis esté **publicado** antes de enviarlo. El envío real está **apagado por flag** hasta completar el rollout (ver manual). Si algo falla (entrega o creación del Lead), un proceso en segundo plano lo reintenta sin re-enviar lo ya enviado, y una señal de salud lo marca.

> Detalle técnico: §Delta TASK-1279 en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md). Operación paso a paso: [manual — enviar informe + crear Lead](../../manual-de-uso/growth/enviar-informe-aeo-crear-lead.md).

## Cómo entiende la categoría de cada marca (Brand Intelligence — TASK-1288)

Para que el análisis sirva a **cualquier** tipo de marca (no solo agencias), el grader primero entiende **qué es** la marca antes de preguntarle a los motores. Esto resuelve el problema que antes daba un "0" falso a marcas como una aerolínea: el sistema le preguntaba "¿qué agencias de aerolíneas hay?", una pregunta sin sentido.

- **El campo "industria" no es confiable.** En las organizaciones, la industria viene de fuentes mezcladas (un código de HubSpot, un texto en español del registro chileno, o vacío). Por eso no se le cree directamente.
- **Lee la marca una sola vez (Brand Intelligence).** El sistema visita el sitio de la marca (su contenido legible) y consulta cómo la conoce el mercado (Knowledge Graph/Wikipedia), y con eso entiende qué hace. Esa lectura se guarda y la reusan la categoría, el modelo de negocio y los prompts — no se lee tres veces.
- **Modelo de dos planos.** Las categorías grandes (macro) y medianas (mid) son una lista corta y gobernada; el detalle fino (ej. "fabricante de pinturas", "aerolínea low-cost") se guarda como **dato descriptivo**, no como una categoría nueva. Así no hay que inventar una categoría por cada nicho.
- **Si no se puede clasificar con confianza, queda "sin resolver"** y un humano lo confirma — el sistema nunca adivina en silencio.
- **Ejemplos reales:** Sky Airlines → "aerolíneas de pasajeros"; Grupo Berel → "manufactura" + "fabricante de pinturas"; Banco de Chile (que tenía la industria mal puesta) → el sistema lo corrigió a "finanzas".

> Detalle técnico: §Delta TASK-1288 en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md). Código: `src/lib/growth/ai-visibility/{taxonomy,brand-intelligence}/**`. Lectura grounded detrás del flag `GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED` (OFF por costo).

## Cómo entiende el modelo de negocio de cada marca (TASK-1289)

Saber la **categoría** no basta: una misma categoría tiene marcas muy distintas (un banco que atiende personas y un banco que vende software a empresas son ambos "finanzas", pero sus clientes buscan cosas opuestas). Por eso el grader también clasifica el **modelo de negocio** de la marca — el eje que decide **cómo se le pregunta a los motores**. Esto cierra el segundo trozo del "0" falso: el sistema ya no asume que toda marca es una agencia que le vende a otras empresas.

- **Sirve para cualquier marca, no solo aerolíneas o agencias.** Los modelos posibles son: marca de consumo (B2C), proveedor de servicios B2B, producto/software B2B, retail/ecommerce, marketplace, institución pública, o "sin resolver".
- **Lo deriva de lo que ya entendió.** Usa la lectura de la marca (Brand Intelligence) cuando hay confianza; si no, una pista conservadora desde la categoría. En categorías ambiguas (manufactura, finanzas, salud) **no adivina** — queda "sin resolver" y lo decide la lectura del sitio o una persona. **Nunca** asume "agencia" por defecto (ese era justo el error).
- **Una persona del equipo puede corregirlo.** Si la clasificación quedó mal, un operador (Growth/AM) la cambia con un registro auditado de quién, cuándo y de qué a qué.
- **Ejemplos reales:** Sky Airlines, Grupo Berel (pinturas) y Banco de Chile → "marca de consumo"; Vercel → "producto/software B2B"; Efeonce → "proveedor de servicios B2B".

> Detalle técnico: §Delta TASK-1289 en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md). Código: `src/lib/growth/ai-visibility/taxonomy/business-model.ts` + `override-business-model.ts`. Eje `business_model` en `grader_profiles` (aditivo, sin flag); lo consumen los packs de prompts (TASK-1290).

## Qué preguntas le hace a los motores (prompts por marca — TASK-1290)

El grader mide si una marca aparece haciéndole a los motores de IA las preguntas que un **comprador real** haría. Antes esas preguntas estaban fijas y pensadas para agencias ("¿qué agencias de {categoría} hay?"), lo que daba un "0" falso a marcas de consumo. Ahora las preguntas se **generan por marca** según su categoría y su modelo de negocio.

- **Cada marca tiene su propio set de preguntas.** Una aerolínea recibe preguntas de pasajero ("mejores aerolíneas low cost", "¿qué aerolíneas vuelan de Santiago a Calama?", reseñas, equipaje, precio); un software B2B, preguntas de evaluación (integraciones, seguridad, alternativas); una agencia, las de antes. Mezcla preguntas de **descubrimiento** (que NO nombran la marca — miden si te encuentran a ciegas) y de marca (reputación, riesgo).
- **El set se arma una vez y se congela.** Un asistente de IA propone las preguntas (entendiendo qué hace la marca); una persona del equipo las revisa y aprueba; a partir de ahí el grader usa ese set fijo en cada medición (reproducible, sin costo extra por medición). Si no hay un set aprobado, usa una plantilla por arquetipo (consumo/B2B/retail/…) — nunca preguntas rotas.
- **La forma de puntuar NO cambió.** Sólo cambian las preguntas; el cálculo del puntaje (presencia, share of voice, citación) es el mismo.

> Detalle técnico: §Delta TASK-1290 en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md). Código: `src/lib/growth/ai-visibility/prompt-packs/{archetypes,authoring}/*` + `prompt-set-store.ts`. Detrás de los flags `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` + `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED` (default OFF; rollout tras eval TASK-1292 + review TASK-1291).

## Límites actuales

- No usa IA para escribir el score ni la narrativa central del reporte: el score y el reporte son deterministas/versionados; la extracción LLM opcional solo enriquece campos acotados y está OFF por defecto.
- No aplica automáticamente los Fix-It Artifacts: sólo los entrega para revisión/aplicación humana.
- No habilita todavía runs de portal/trial en producción; los flags `PORTAL_RUN` y `TRIAL` siguen OFF.
- No tiene re-grade E2E con cliente real opt-in: el scheduler está ON en staging, pero la DB auditada no tiene perfiles due/opt-in.
- No debe tratar Perplexity como verificado post-flip hasta correr un smoke async low-volume en `ops-worker-00418-2m6` o posterior.
- No debe prender producción sin release control plane, migraciones/capabilities, rotación de credenciales expuestas y sign-off legal/comercial.

> Detalle tecnico: invariantes y contrato en [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) (§Delta 2026-06-24). Codigo: `src/lib/growth/ai-visibility/**`. Operacion: [manual de smoke](../../manual-de-uso/growth/ai-visibility-grader-smoke.md).
