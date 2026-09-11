# AI Visibility Grader / Surround Discovery Audit — integración skill ↔ producto Greenhouse

> **Qué es esto.** Greenhouse está construyendo un producto que *operacionaliza*
> esta skill: un **grader público de visibilidad en IA**, gobernado desde
> Greenhouse, en el nuevo dominio `growth`. Esta skill es el **conocimiento de
> dominio** detrás del grader; el grader es el **motor gobernado** que mide,
> puntúa y recomienda. Cuando trabajes el grader, carga esta skill; cuando
> asesores AEO en Efeonce, recuerda que existe este producto. Sello: as-of
> 2026-06-24 (fecha de los docs), con delta operador del 2026-09-11 (panel
> competitivo multi-marca).

## Docs canónicos del plan (la verdad vive ahí, no acá)
- ADR: `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
- Arquitectura: `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- Dominio: `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- Tasks fundacionales: `TASK-1226` (provider adapter foundation), `TASK-1227`
  (normalization + scoring engine) y el spike `TASK-1228`: **complete**.
- Próximas (creadas, sin implementar): `TASK-1861` (grader operable por MCP:
  correr, leer, informe web y PDF, con autoridad humana delegada) · `TASK-1863`
  (multi-mercado: una marca, N mercados, lotes y matriz entre mercados) ·
  `TASK-1864` (superficie agéntica autosuficiente del MCP: instructions, kit de
  cliente, eval end-to-end de agentes).
- **Esta skill NO redefine el contrato**: si hay drift, prevalece el doc del
  repo. Acá solo mapeamos conocimiento ↔ producto.

## Render público del informe (live, as-of 2026-07-03)

El informe que ve el lead **NO se renderiza en Greenhouse**: vive en el hub
público **`efeoncepro/efeonce-think` → `think.efeoncepro.com/brand-visibility/r/<token>`**
(Astro, fetch server-side del modelo headless, `noindex`, token-gated). Greenhouse
es el data owner (endpoint `GET /api/public/growth/ai-visibility/report/[token]`,
TASK-1280); el hub es render tonto (no re-deriva scoring). La **escalera de madurez
5-Be** de este framework se implementó allí como **primitiva canónica reutilizable**
`MaturityLadder`. ADR: `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`.

**El enlace del correo + el `report_url` de HubSpot apuntan al hub (TASK-1324, released 2026-07-03).**
Fuente única = `buildPublicReportUrl` (`src/lib/growth/ai-visibility/hubspot/report-link.ts`): arma
`${PUBLIC_GRADER_HUB_URL || 'https://think.efeoncepro.com'}/brand-visibility/r/<token>` (env var
dedicada, default-safe = hub prod; NO reusar `NEXT_PUBLIC_APP_URL` = portal). Un cambio, ambos
consumers (email + HubSpot) alineados. El path viejo del portal `greenhouse.efeoncepro.com/grader/r/<token>`
(que daba 404) tiene un **redirect puente 307** en `next.config.ts` para recuperar correos ya enviados.
Anti-regresión: `report-link.test.ts` afirma que NUNCA vuelve al host/path muerto.
Tasks: `TASK-1325` (hub, complete) · `TASK-1324` (repoint del enlace, complete/released).

## Grader → Radiografía AEO (diagnóstico → demostración)

El **AI Visibility Grader** y la **Radiografía AEO** no compiten:

| Activo | Trabajo |
|---|---|
| **Grader** | Mide cómo una marca aparece en motores de respuesta, qué fuentes la sostienen y dónde están los huecos |
| **Radiografía AEO** | Muestra cómo uno de esos huecos se convierte en un artículo visible, estructurado, citable y distribuible |

Regla para agentes: si el comprador ya vio un score o un informe y pregunta *"¿y cómo se arregla?"*, el siguiente activo es la Radiografía, no otro dashboard. Si la conversación empieza sin evidencia, primero corre o revisa el Grader.

> **Delta 2026-08-27 (TASK-1709) — el Grader ya no está solo en la etapa pre-firma.**
> El producto Greenhouse que operacionaliza esta skill ganó un segundo eslabón: el
> **diagnóstico SEO de prospecto** (dominio `growth`, capability
> `growth.seo.prospect_diagnostic.run`, solo admin/account; flag
> `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED`, **ON en Vercel Production desde 2026-08-27** (verificado con `vercel env ls`; corrida real sobre `skyairline.com`: previsto USD 0,2050 vs medido USD 0,1991). 🔴 Un `disabled` hoy es una REGRESION, no un estado legitimo).
> Encadenamiento comercial vigente: (1) el Grader mide si la IA lo menciona →
> (2) el diagnóstico cuantifica la pérdida orgánica del dominio con dato del
> proveedor, sin pedirle acceso al prospecto (~USD 0,25/corrida, tope duro;
> todo lente `◑ estimada`, sin score ni veredicto) → (3) la Radiografía AEO
> demuestra cómo se arregla → (4) la propuesta cierra. Docs canónicos:
> `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (Delta 2026-08-27) ·
> `docs/documentation/growth/diagnostico-seo-prospecto.md` ·
> `docs/manual-de-uso/comercial/diagnostico-seo-prospecto-en-venta.md`.

La Radiografía vive en `think.efeoncepro.com/muestras/<slug>-<token>` y su runtime está en `efeonce-think`; en `greenhouse-eo` sólo viven el gobierno documental y los playbooks. Manual comercial: `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md`. Manual técnico/runtime: `docs/think/radiografia-aeo-manual.md`.

## Reporte público final: contrato de facts (live, as-of 2026-07-04)

El mockup enterprise del informe se promovió a reporte final user-facing en
`efeonce-think` sólo después de cerrar TASK-1331: Greenhouse subió el contrato
público a `modelVersion=1.1.0` y expone `model.viewFacts` como facts
server-derived. Ese namespace cubre Share of Model / engine coverage, totales
globales de citas, benchmark competitivo, sentimiento, readiness, highlights de
dimensiones, share facts y `levels[].isNext`.

Regla para agentes SEO/AEO: no uses el render del hub como fuente de cálculo ni
reconstruyas semántica del grader en Astro. La metodología vive en esta skill,
pero el producto final la materializa desde Greenhouse. Si falta un dato para
explicar la visibilidad, pide/implementa el fact backend; el hub sólo pinta y
degrada snapshots antiguos honestamente. No tocar scoring/pesos/probes/normalizer
para ajustes de presentación del informe.

## Uso de un run en auditorías de clientes

Antes de convertir el score en diagnóstico, aplica
`../modules/09_CLIENT_AUDIT_REPORTING.md`: inspecciona el run y las preguntas
realmente ejecutadas, su categoría comercial, competidores, motores, fechas y
respuestas. Un score reproducible puede proceder de un panel inadecuado; un
HTTP 200 con HTML de fallback no acredita MCP ni API. Separa observaciones
rescatables, limitaciones y correcciones de nuestra medición sin modificar el
score histórico ni adjudicar al cliente carencias que la evidencia no demuestra.
Canon: `docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md`.

## Panel competitivo multi-marca (procedimiento operador)

> **As-of 2026-09-11** (caso fuente: SKY frente a LATAM, JetSMART, Avianca y
> Gol, Chile; runs `EO-GRUN-00050` a `00054`). **Hoy es un procedimiento
> operador, no una capacidad gobernada:** no hay ruta HTTP para crear el set
> curado ni para encolar un lote de N marcas. Debería convertirse en capacidad
> (lote de N marcas con el mismo set) sobre `TASK-1861`, `TASK-1863` y
> `TASK-1864`. Uso comercial: `seo-aeo-practice` → `modules/05_CUNA_GRADER.md`
> § 3 + `templates/correo-panel-competitivo-aeo.md`; manual
> `docs/manual-de-uso/comercial/panel-competitivo-aeo-en-venta.md`; números del
> caso en `seo-aeo-practice` → `efeonce/ESTADO_ACTUAL.md` § 3c.

**Qué es.** Correr el Grader sobre N marcas (el cliente + sus competidores) con
**el mismo set de preguntas curado, el mismo día, el mismo mercado y los mismos
5 motores**, para que los informes sean comparables, y leerlos juntos. Es la
versión multi-marca del SoV IA de `../modules/07_MEASUREMENT.md`: sólo es
comparable si las condiciones son idénticas. Sirve en la operación con un
cliente contratado (línea base re-medible con cadencia fija) y como paso de
venta.

Rutas de código relativas a `src/lib/growth/ai-visibility/`.

### Pasos

1. **Diseñar el set desde demanda real.** Semrush `phrase_these` +
   `phrase_questions` (database del mercado; `cl` en el caso SKY) para
   priorizar segmentos; preguntas conversacionales con la situación del usuario,
   no keywords. **Máximo 12 en modo `full`.** Composición del caso SKY: 8 de
   descubrimiento sin marca (presupuesto, equipaje, ruta sur, negocios,
   Argentina, Brasil, Perú/Colombia, familias + mascotas), 1 comparativa anclada
   en el cliente (*"¿Qué alternativas hay a SKY…?"*, **texto literal idéntico en
   los 5 runs**) y 3 que nombran la marca con `{{brand}}` (reputación 2026,
   reclamos, identidad). Tags del vocabulario cerrado
   (`prompt-packs/tag-vocabulary.ts`): `family`, `fanOutType`, `intentStage`,
   `namesBrand`.
2. **Crear los perfiles y activar el set** con un script local que llama
   funciones de dominio, **firmado por el operador**:
   `findOrCreateGraderProfile` (`store.ts`) + `createGraderPromptSetDraft` +
   `approveGraderPromptSet` (`prompt-packs/prompt-set-command.ts`; capability
   `growth.ai_visibility.prompt_set.manage`; sujeto armado desde
   `getTenantAccessRecordByUserId`). `generation_strategy` sólo admite
   `llm | template_baseline`, así que el set curado se registra
   `template_baseline` con procedencia `operator_curated:<caso>` en
   `grounding_sources`. **Aprobar activa directo** (supersede el set activo
   previo del perfil).
3. **Encolar** por la ruta admin en staging:
   `pnpm staging:request POST /api/admin/growth/ai-visibility/runs` con
   `brandName`, `websiteUrl`, `market: "Chile"`, `locale: "es-CL"`,
   `category: "aerolinea de pasajeros"`, `competitorsDeclared`, `mode: "full"`,
   `runKind: "internal_audit"` e `idempotencyKey`. El run usa el set activo del
   perfil si el flag de arquetipos está ON (staging: ON). **Encola la primera
   marca, verifica en el run `prompt_set_id` no nulo y 12 prompts, y recién ahí
   encola el resto.**
4. **Esperar al worker** (Cloud Scheduler cada 5 min): ejecuta, puntúa, corre
   probes y **auto-publica** el informe (~30 s tras terminar). ~17 min por run;
   el worker llegó a ejecutar 2 en paralelo (5 runs en ~1 h). 🔴 **Nunca
   `POST /score` ni `publish` manual:** pisa la extracción de prosa del worker.
5. **Revisión humana.** Si el score queda `review_required` (delivery
   `in_review`), **lee la frase que lo disparó** y, con decisión del operador,
   aprueba con `approveAiVisibilityReport({ runId, reviewedByUserId, reason })`
   (`review/commands.ts`), firmado por la persona. Sin lead ni organización, la
   sync HubSpot y el correo se omiten (`no_lead`).
6. **Entregar y verificar.** Token en `grader_reports`; web larga
   `https://think.efeoncepro.com/brand-visibility/r/<token>`, corta
   `https://think.efeoncepro.com/s/<code>` (`grader_report_short_links`), PDF
   `https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/report/<token>/pdf`.
   Verifica **200 + `<title>` con la marca**, y el PDF como `application/pdf`.
   Staging y producción comparten `greenhouse_growth`: un token publicado desde
   staging renderiza en el hub productivo. Los tokens **no vencen**
   (auto-publish sin `expires_at`).
7. **Análisis cruzado simétrico.** Cuenta las menciones de TODAS las marcas con
   la misma regla en todas las respuestas: por pregunta, por motor, la pregunta
   de alternativas, cuota de citas del sitio propio y fuentes de terceros.

### 🔴 Trampas del input

- **`market` va como nombre** (`"Chile"`), no ISO: el ISO se interpola crudo en
  los prompts ("…en CL") y el provider de Google AI acepta `location_name`.
  Fuera de CL/MX/CO/PE/US, un ISO cae a Estados Unidos.
- **`category` debe resolver en la taxonomía** (`taxonomy/catalog.ts`):
  `"aerolinea de pasajeros"` es alias exacto de `sector:passenger_airlines`. La
  etiqueta canónica ("Aerolineas de pasajeros", sin tilde) aparece en los
  prompts sólo si el set usa `{{category}}`; el set curado la evita escribiendo
  "aerolínea(s)" literal.
- **La ruta admin no acepta `businessModel`:** sin set activo, sale el pack
  genérico de 7 preguntas (`gn01`–`gn07`).
- **El perfil se identifica por marca + mercado + locale** y los competidores
  quedan fijos desde el primer run (no hay command para editarlos). Un nombre ya
  usado reusa el perfil viejo: `"SKY Airline"`/Chile/es-CL traía
  `blog.skyairline.com` y Flybondi; por eso el caso usó `"SKY"`.
- **Coincidencia de nombres literal**, palabra completa, sin mayúsculas y **sin
  alias**: `"LATAM"` (no "LATAM Airlines") para contar ambas formas; `"SKY"` (no
  "SKY Airline"). "Gol" es palabra común en español (riesgo bajo en respuestas
  de aerolíneas). El slot `{{competitor}}` usa sólo el primer competidor
  declarado y se descarta si la lista está vacía.

### ⚠️ Límites conocidos (declararlos siempre)

| Límite | Referencia | Consecuencia |
|---|---|---|
| **Extracto de 600 caracteres** | `GROWTH_AI_VISIBILITY_EXCERPT_MAX = 600` (`contracts.ts:210`) | Las menciones se cuentan sobre el tramo inicial (donde suele estar la recomendación); las marcas al final de listas largas quedan subcontadas. `raw_evidence_pointer` fue nulo en las 300 observaciones: **no hay texto completo para recontar** |
| **Falso positivo del probe `llms.txt`** | — | Un SPA que responde 200 con HTML en `/llms.txt` salió como "llms.txt presente con contenido curado" (falso). "robots.txt no bloquea" es trivialmente cierto si no hay robots real. **No citar esos probes sin abrir el archivo** |
| **Detector de lenguaje sensible por substring** | `RISKY_REVIEW_TERMS` (`review-gates/gates.ts`), sobre la narrativa extraída (`messageDriftClaims` + `categoryAssociations`) | "denuncia" disparó con "denunciados" (Avianca) y "quiebra" con una frase sobre Gol; "demanda" dispararía con "demandadas". **Una revisión no es necesariamente un problema real** |
| **Eco de la pregunta comparativa** | diseño del set | La que nombra al cliente produce eco del cliente en esas respuestas |
| **Sitios que bloquean la lectura automática** | — | Lecturas técnicas "sin dato" (LATAM, Avianca, Gol), **nunca cero** |
| **Pruebas técnicas desde nuestra red** | — | GPTBot → 403 visto desde nuestra red no equivale a probar desde las IPs de OpenAI: **presentarlo como algo a validar** |
| **Foto de un día** | — | La tendencia exige repetir el mismo panel con cadencia fija |
| **Sin atribución a ventas** | `seo-aeo-practice` → módulo 05 § 4 | No se promete revenue |

🔴 Los tres primeros son defectos del grader encontrados el 2026-09-11 y **aún
no tienen task**: follow-up pendiente de registrar (`greenhouse-task-planner`)
antes de corregirlos.

## Tesis del producto (por qué importa para la skill)
HubSpot mide *percepción de marca* en answer engines. Efeonce convierte los
**gaps de visibilidad en IA en un plan operativo** (contenido, CRM, PR, SEO/AEO,
ventas) que entra a HubSpot/Greenhouse. Público = "AI Visibility Grader";
frame propietario interno = **"Surround Discovery Audit"**. La durabilidad no es
"tu score es 47/100", es el diagnóstico accionable — que es exactamente lo que
esta skill sabe producir.

## Mapeo duro: las 7 dimensiones del score ↔ módulos de la skill

El grader puntúa 7 dimensiones (score `ai_visibility_score_v1`, determinista y
versionado). **Cada dimensión tiene su "teoría" en un módulo de esta skill** —
úsalos para diseñar el scoring, los normalizers y, sobre todo, el motor de
recomendaciones:

| Dimensión (peso) | Qué mide | Módulo skill = base de conocimiento |
|---|---|---|
| **AI Visibility** (25) | la marca aparece en respuestas de answer engines | `04_AEO_GEO` (citabilidad) + `07_MEASUREMENT` (SoV) |
| **Entity Clarity** (15) | los motores entienden quién es / qué vende / para quién | `03_EEAT_ENTITY` (entidad/Knowledge Graph) |
| **Category Ownership** (15) | asociada a la categoría y casos de uso correctos | `02_SEO_CONTENT` (topical authority) + `03` (co-ocurrencia) |
| **Competitive Share of Voice** (15) | aparece vs. competidores declarados/detectados | `07_MEASUREMENT` (SoV IA) + `05_OFFPAGE_AUTHORITY` |
| **Citation Quality** (15) | las fuentes que forman la respuesta son creíbles/frescas | `04` (citabilidad) + `05` (digital PR) + `01` (schema/frescura) |
| **Message Alignment** (10) | la narrativa IA coincide con el posicionamiento deseado | `03` (descripción canónica) + `07` (monitoreo de exactitud/alucinación) |
| **Revenue Intent Coverage** (5) | aparece en prompts de compra/comparación | `02` (contenido bottom-funnel/pricing) + `04` (fan-out comparativo/implícito) |

> Por diseño esto **diverge de HubSpot**: ellos enfatizan sentimiento/presencia/
> share; Efeonce enfatiza *discovery comercial* (entity clarity, category
> ownership, citation quality, message drift, revenue-intent). La skill ya está
> construida con ese sesgo comercial.

## Motor de recomendaciones: gap → acción ↔ módulos

El grader convierte gaps en recomendaciones. Cada recomendación se fundamenta en
un módulo de la skill (esto es lo que evita recomendaciones genéricas):

| Gap detectado | Recomendación | Módulo que la sustenta |
|---|---|---|
| Baja entity clarity | reescribir página core + structured data de empresa | `03` + `01` (JSON-LD) |
| Baja category ownership | explainer de categoría + comparativas + perfiles 3os | `02` + `03` + `05` |
| Citation quality débil | menciones externas creíbles + frescura de fuentes propias | `04` + `05` (digital PR) + `01` |
| Competidores dominan prompts de compra | contenido de comparación/alternativas + casos | `02` + `04` |
| Message drift | alinear web/LinkedIn/HubSpot/bios con la narrativa | `03` + `05` |
| Revenue intent débil | pricing/implementación/casos de uso + pruebas | `02` + `04` |

## Prompt packs ↔ Query Fan-Out + prompt research

Los **prompt packs** del grader (familias: awareness, problem-aware,
consideration, comparison, trust, purchase-intent, local-intent,
enterprise-intent, risk/reputation) son exactamente el **espacio de Query
Fan-Out + prompt/answer-space research** de `04_AEO_GEO`. La plantilla
`../templates/fan-out-matrix.md` es, de hecho, una **herramienta de diseño de
prompt packs**: úsala para versionarlos. Recuerda los invariantes del doc:
prompt packs activos son **inmutables** (cambio = nueva versión); input del
usuario se interpola como **dato delimitado, nunca como instrucción**
(anti prompt-injection); no enviar PII (email/teléfono) a los providers.

## El grader ES la versión productizada de "Share of Voice IA" (módulo 07)

En `07_MEASUREMENT` describo un **método propio** de SoV IA (panel de prompts ×
motores, registrar presencia/citas/sentimiento, cadencia fija). **El grader es
ese método, productizado y gobernado**: server-side, cost-controlled, evidence
ledger append-only, score determinista versionado, signals de fiabilidad/costo.
Es la alternativa *first-party* de Efeonce a Profound/Peec/Otterly.

- **MVP / hoy / cualquier cliente:** método manual con WebSearch (módulo 07).
- **Plataforma / Efeonce:** el grader (`growth.ai_visibility`), ya operativo;
  para comparar N marcas en condiciones idénticas, ver § *Panel competitivo
  multi-marca*.
- Misma teoría, distinto vehículo. No los trates como cosas separadas.

## Providers = muestreo de answer engines (no réplica)

El grader observa OpenAI (Responses API + web search), Perplexity (Sonar) y
Gemini (Google Search grounding) como **aproximaciones medibles** del
comportamiento de answer engines, no como réplica exacta del producto consumer.
Esto refuerza el principio de la skill: **cada motor es un canal distinto**
(solo ~11% de solapamiento de fuentes) y los reportes deben **declarar que es un
diagnóstico muestreado y asistido por IA** (sin garantías). La evidencia de
provider **no es verdad de negocio**: se normaliza y puntúa después.

## Fronteras y reglas duras del dominio `growth` (respétalas al asesorar/construir)
- **`growth` es el dueño** del grader (profiles, runs, prompt packs, provider
  observations, normalized findings, score, report, handoff). **NO** lo metas en
  `commercial` (que es revenue motion cualificado), ni en `public_site` (solo
  hospeda la página), ni en Verk/Kortex.
- **Providers solo server-side** desde `growth.ai_visibility`; la UI pública, el
  browser y HubSpot **nunca** llaman providers IA/search.
- **Score determinista y versionado** — el LLM genera/extrae evidencia, pero
  **nunca asigna el score**. Recalcular el mismo run con el mismo `score_version`
  da el mismo resultado. Evidencia insuficiente = `insufficient_data` /
  `review_required`, **nunca** precisión falsa.
- **Default OFF + flags** (`GROWTH_AI_VISIBILITY_*_ENABLED`); fake/no-op adapter
  para local/test; degradar honesto si falta secret/flag.
- **Full API parity:** la UI pública, admin, Nexa/MCP y scripts consumen los
  mismos readers/commands server-side. Acciones de Nexa = `propose → confirm →
  execute`, nunca write directo.
- **Costo:** `grader_runs.estimated_cost_usd` es un guard aproximado de observaciones principales, no costo all-in.
  Nunca presentes US$0,50 como costo real garantizado: la reconciliación 2026-07-27 observó ~US$0,3067 en providers
  principales antes de extracción LLM, y el costo de `ops-worker` compartido requiere ledger de atribución.
- **PII:** no enviar email/teléfono a providers; data pública = al menos
  `confidential`; postura Ley 21.719/GDPR-compatible (clientes LATAM).

## Naming (úsalo consistente en copy y análisis)
- **AI Visibility Grader** — lead magnet público.
- **AI Visibility Snapshot** — artefacto corto de ventas (HubSpot/account).
- **Surround Discovery Audit** — diagnóstico pagado/estratégico (frame IP Efeonce).
- **Greenhouse AI Visibility Monitor** — futura superficie recurrente de cliente.
- Evitar `aeo` como nombre de dominio (la capacidad es más amplia que la sigla).

## Estado y secuencia (as-of 2026-06-24)

> **Delta 2026-09-11:** esta sección es histórica. `TASK-1226`, `TASK-1227` y
> `TASK-1228` están **complete**; lo que viene es `TASK-1861`, `TASK-1863` y
> `TASK-1864` (ver *Docs canónicos del plan*).
- **Fase 0 (hecha):** ADR + arquitectura + dominio aceptados, sin runtime.
- **TASK-1228 (to-do, P1) — Discovery & Eval Spike (precursor):** valida
  empíricamente el modelo de medición ANTES de hornearlo — corre un prompt pack
  borrador × OpenAI/Perplexity/Gemini sobre un golden set y produce: discriminación
  de las 7 dimensiones + pesos recomendados, varianza run-to-run + estrategia de
  muestreo, costo/run + cost ceiling, recomendación determinista-first vs LLM para
  extracción, y prompt pack V1 + golden eval set versionados. Es la versión manual
  del método de SoV de `../modules/07_MEASUREMENT.md`. Bloquea a 1227 (pesos/
  varianza/extracción/golden set); informa a 1226 (cost ceiling + prompt pack).
- **TASK-1226 (to-do, P1):** foundation de provider adapters + evidence ledger +
  flags + fake adapter + smoke harness. NO UI, NO HubSpot, providers OFF.
- **TASK-1227 (to-do, blocked by 1226):** normalization → `normalized_finding`
  + scoring `ai_visibility_score_v1` (las 7 dimensiones) + gates de confidence/
  review. NO UI, NO HubSpot.
- **Futuro (candidatos C–H del arch doc):** report builder, admin control plane
  (`/admin/growth/ai-visibility`), HubSpot handoff (props `ai_visibility_*`),
  public grader page, private beta + sales playbook, client monitoring/Verk.
- **Decisión abierta clave (ata con el resto de la skill):** runtime público =
  Astro target vs WordPress/Kinsta legacy vs ruta Greenhouse. Ver la nota de
  migración Astro en `EFEONCE_OVERLAY.md`.

## Cómo usar esto operativamente
- **Si te piden comparar una marca con sus competidores:** corre el panel
  competitivo multi-marca (§ arriba) y entrégalo con su bloque de límites.
- **Si te toca un follow-up del grader** (hoy: `TASK-1861`, `TASK-1863`,
  `TASK-1864`, o los tres defectos del panel aún sin task): carga el doc de
  arquitectura del repo + esta skill. Usa el mapeo de dimensiones para los
  normalizers/score y el motor de recomendaciones. Respeta los invariantes
  duros de arriba. Sigue el `implement-task` flow del repo.
- **Si asesoras AEO para Efeonce/un cliente:** el grader es tu instrumento de
  medición y tu lead magnet; encuadra el diagnóstico con el frame "Surround
  Discovery" y aterriza las recomendaciones en los módulos de la skill.

> **Cross-refs:** núcleo `../SKILL.md`; medición/SoV `../modules/07_MEASUREMENT.md`;
> AEO/fan-out `../modules/04_AEO_GEO.md`; entidad `../modules/03_EEAT_ENTITY.md`;
> overlay Efeonce + nota Astro `EFEONCE_OVERLAY.md`.
