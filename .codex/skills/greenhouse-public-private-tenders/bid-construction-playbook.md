# Playbook de Construcción de Licitaciones (método end-to-end Efeonce)

El **método canónico** para construir una propuesta de licitación de punta a punta, orquestando las skills del ecosistema. Los otros companions cubren *una etapa* (admisibilidad, pricing, propuesta, etc.); **este las encadena en un flujo repetible** y dice qué skill entra en cada fase. Es el "director de orquesta" del bid.

> **Regla raíz del método:** una propuesta de licitación no se improvisa ni se escribe de memoria. Se **funda en evidencia** (bases leídas, contexto de negocio real, datos de nómina, casos citables) y se **orquesta con las skills de dominio** (contenido, SEO/AEO, talent, finance, copywriting), no con supuestos. Cada afirmación se encadena a su mecanismo o su prueba.

## Cuándo usar este companion

Cárgalo cuando el encargo es **"armar/construir la propuesta de esta licitación"** de principio a fin (no una etapa suelta). Para una etapa específica, salta directo a su companion (ver `SKILL.md` → árbol de decisión).

## El flujo en 10 fases

Cada fase declara: **qué se hace**, **qué skill/companion entra**, y **el output** que alimenta la siguiente.

### Fase 0 — Intake y lectura de bases
- Ubica la carpeta de la licitación y **lee las bases completas** (objeto, calendario, requisitos, criterios de evaluación, SLA, penalidades, plazo del contrato, garantías/comisiones, formato y plataforma).
- Extrae lo load-bearing: **fecha de entrega**, cierre de consultas, formato de oferta (PDF/planilla), validez, y quién asume comisiones.
- **Output:** resumen ejecutivo de las bases + tabla de plazos. Detecta inconsistencias (fechas que chocan) → candidatas a consulta si el plazo aún abre.
- *Skills:* esta skill (lectura); si es Chile público → `chile-publico-operativo.md`.

### Fase 1 — Admisibilidad primero (la puerta #1)
- Corre el checklist de admisibilidad **antes** de invertir en la oferta. Separa **excluyente vs. lo que puntúa**.
- Marca en rojo lo faltante (declaraciones juradas, planilla económica, garantía, validez).
- **Output:** matriz de cumplimiento inicial (requisito → dónde se cumple → estado).
- *Companion:* `compliance-riesgo-integridad.md`. **Si un excluyente no es subsanable a tiempo → NO-BID.**

### Fase 2 — Bid/no-bid y fit
- Evalúa fit contra las capacidades de Efeonce + contexto de relación (¿cliente existente? ¿otra área?).
- Define el **ángulo estratégico** y qué diferenciadores usar o evitar (decisión del operador cuando hay sensibilidad política/contractual).
- **Output:** GO/NO-GO preliminar + ángulo. *(El GO económico se confirma en Fase 6: nunca GO sin margen.)*
- *Companions:* `bid-lifecycle-go-no-go.md`; *skills:* `commercial-expert`, `efeonce-agency`.

### Fase 3 — Contexto de negocio y diferenciadores (fundar, no suponer)
- Carga el context pack (`docs/context/`) y `efeonce-agency`: marca, Golden Circle, casos citables, proof points, messaging por audiencia (procurement).
- Elige **proof points reales** (casos: Sky/Bresler/Berel/SSilva) y respeta las prohibiciones (claims falsos, casos que no cerraron).
- **Output:** lista de diferenciadores aplicados a *esta* licitación, cada uno encadenado a su mecanismo.
- *Skills:* `efeonce-agency`, `research-benchmark-operator` (si hace falta munición competitiva).

### Fase 4 — Alcance y método experto (invocar skills de dominio + analizar el activo real)
- Para el servicio licitado, **invoca las skills de dominio** que fundan el alcance con criterio, no a ojo: cadencia, metodología, entregables, métricas.
- Ejemplos: contenido/blog → `content-marketing-studio` (cadencia, pillar/cluster) + `seo-aeo` (enfoque técnico, motores, reportería); performance → `growth-marketing-cro`/`digital-marketing`; medios → `commercial-expert`.
- **Analiza el activo REAL del cliente con datos, no supongas.** Un servicio casi nunca parte de cero: el cliente ya tiene sitio/blog/redes/marca con tracción. Antes de dimensionar el alcance, **audita ese activo con herramientas reales** (fetch directo, Semrush, y el **AI Visibility Grader** para el eje AEO — cómo correrlo: memoria `reference_ai_visibility_grader_how_to_run` + runbook `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`). El grader **publica un informe público** (`report/publish` → token `grt-*`): incrustar la URL `think.efeoncepro.com/brand-visibility/r/<token>` en la propuesta es un diferencial fuerte (el cliente ve su propio informe de visibilidad IA, en vivo). Regla de honestidad: mide, no infieras — nunca afirmes "no aparece/no lo cita la IA" sin correr el grader (afirmarlo falso en una licitación es grave). **Regla de operación:** para el informe COMPLETO (tono + categoría), encolar el run async y dejar que el **worker** ejecute+puntúe+auto-publique — NUNCA `POST /score`/publish manual (la extracción de prosa solo corre en el worker; un score manual congela un informe incompleto — caso SKY 2026-07-11). Dos cosas salen de ahí: **(1) evidencia para la propuesta** —mostrar que ya hiciste la tarea es un movimiento Challenger ("teach") que vale más que un pitch genérico— y **(2) el mix correcto**: casi siempre el mayor ROI no es solo *producir nuevo*, sino **optimizar/refresh lo existente + cerrar gaps técnicos** (near-miss en posiciones 6–12, schema/metadatos ausentes, etc.).
- **El stack del cliente es un diferenciador.** Detecta la tecnología del activo (p. ej. WordPress) y úsala: si Efeonce tiene expertise/partnership ahí (WordPress + partner de Automattic), puede operar la capa técnica *directamente sobre su plataforma*, algo que un proveedor de solo-contenido no hace.
- **Benchmarkea a la competencia del cliente** (`research-benchmark-operator` + Semrush + fetch). Mide a los competidores directos en su mismo terreno: ¿tienen el mismo activo (blog/sitio)? ¿quién va adelante? ¿dónde está la batalla directa (mismos términos/destinos)? ¿hay una carrera que nadie ganó aún (p. ej. AEO)? Esto convierte la propuesta en un argumento competitivo ("vas ganando esta carrera y nadie ganó la otra — te ponemos primero"), no solo en una lista de entregables. Declara peer set + `as-of` + confianza.
- **Output:** definición de alcance, volumen y enfoque metodológico defendible, **calibrado con el diagnóstico del activo real**.

### Fase 4-bis — Presentar el diagnóstico AEO en la propuesta (patrón replicable)

El diagnóstico del grader (Fase 4) es un diferencial brutal, pero **cómo se presenta decide si convence o abruma**. Patrón de 3 capas, validado en SKY:

1. **Números duros en bullets, encadenados a negocio** (no dimensiones sueltas). Elige 3-4 hechos que cuenten una historia: claridad de marca (¿la IA te conoce?), **citas del activo licitado** (¿el blog/sitio del cliente aparece como fuente? — casi siempre 0, y es el claim más potente), ownership de categoría (¿quién lidera la conversación vs. el cliente?). Cada bullet con su número real + qué significa.
2. **Enlace vivo al informe público** (`think.efeoncepro.com/brand-visibility/r/<token>`): "puedes ver el informe completo, en vivo". Que el cliente vea su propio diagnóstico en vivo es un movimiento Challenger (teach) que vale más que un pitch.
3. **La escalera de madurez Be X con sus valores REALES** — ordena todo en una foto. Los cinco peldaños (framework AEO de Efeonce): **Ser encontrada** (Be Found) · **Ser legible** (Be Readable) · **Ser correcta** (Be Correct) · **Ser accionable** (Be Actionable) · **Ser intrínseca** (Be Intrinsic). Los valores (score + severidad por peldaño) salen de `model.levels` del informe público — **NUNCA inventados**. Tabla: `peldaño (Be X) | valor | qué mide | qué significa estar ahí`. Cierra con la lectura: *fortalezas en los peldaños óptimo + los peldaños crítico = exactamente el scope del servicio*. (Ejes: `found/readable/correct/intrinsic` son eje **percepción**; `actionable` es eje **agentic** — la frontera de la web agéntica.)

**⚠️ Dos trampas de honestidad (no las pises):**

- **Dos lentes del Be X, y NO se contradicen.** La lente **técnica inferida** (¿el sitio tiene schema/meta/`llms.txt`?) puede decir "Be Readable débil" mientras la lente **medida por el grader** (¿la IA percibe/representa a la marca?) dice "Ser legible óptimo" — porque una mide el **activo** y la otra la **percepción**. Al cliente va **solo la lente medida** (la técnica es munición interna para justificar el scope). El puente entre ambas suele ser **Ser accionable** (la frontera agéntica: ahí el gap técnico —datos estructurados ausentes— se ve MEDIDO en la escalera).
- **`citation_quality` mide si las FUENTES que cita la IA son creíbles, NO si son del cliente.** Un `citation_quality` alto NO significa que citen al cliente. Por eso NO va a la propuesta como si midiera la marca; el claim defendible es **por dominios** (¿aparece el dominio/blog del cliente entre las fuentes citadas?). Confundirlos sería afirmar algo falso.

**Regla de operación (Fase 4, recordatorio):** el informe completo (con tono + categoría percibida) SOLO sale del **camino del worker** (encolar run async → el worker ejecuta, puntúa CON extracción de prosa y **auto-publica** el snapshot). **NUNCA** `POST /score` ni `report/publish` manual desde local/Vercel: la extracción de prosa solo corre en el worker, y un score manual congela un informe incompleto (tono/categoría en blanco) — caso real SKY 2026-07-11.

### Fase 5 — Diseño del squad (Managed Squad)
- Diseña el **equipo que se asigna al cliente**: roles, seniority, % dedicación, jerarquía, RACI y sinergias. Un servicio licitado = **Managed Squad** (Efeonce opera), no staff-aug.
- De cara al cliente: **rol + seniority** (sin nombres, salvo consentimiento). Internamente: mapeo a roles de nómina para trazar el loaded cost.
- **Output:** squad blueprint (interno) + tabla de equipo para la §Equipo de la propuesta.
- *Skill:* `greenhouse-talent-people-operator` → `references/client-squad-design.md` + `templates/squad-blueprint.md`.

### Fase 6 — Pricing (cost-plus sobre loaded cost real)
- Levanta el **loaded cost real** desde nómina Greenhouse (`greenhouse_payroll`) por rol × dedicación. Aplica overhead + terceros.
- **Piso = cost-plus**; en **licitación privada con diferenciación fuerte, precio hacia el valor** (no subvalorar por tener un equipo eficiente). Define margen recomendado, **precio lista** y **piso de negociación (walk-away)**.
- Absorbe en el margen: comisión de la plataforma (Wherex) + colchón de penalidad.
- **Output:** oferta económica con precio lista, valor por unidad adicional y walk-away.
- *Companion:* `pricing-garantias-finance.md`; *skill:* `greenhouse-finance-accounting-operator` (loaded cost/tesorería). **Nunca GO si el margen no pasa el umbral con un precio competitivo.**

### Fase 7 — Redacción (con pase de copywriting)
- Redacta la **oferta técnica** modelada hacia lo que evalúan las bases (no genérica). Luego **pase de craft**: anti-humo (claim → mecanismo), beneficios antes que siglas, prueba > hype, es-CL profesional sin voseo, corte de AI-slop.
- **Registro formal, NO tuteo (regla dura).** Una oferta de licitación es un documento contractual que evalúa un comité y que pasa a formar parte del contrato: el género pide **trato formal ("de usted") + institucional (SKY/el cliente en 3ª persona)**, nunca tuteo. El tuteo es correcto para blog/landing/producto (contextos cercanos), no para un deliverable que evalúa procurement. Formal ≠ frío: el contenido sigue cálido en las ideas; lo que sube es el registro gramatical. Aplica **solo a los documentos client-facing** (técnica + económica); los internos (diagnóstico, squad, matriz) dan igual. `tu blog`→`su blog`/`el blog del cliente`; `puedes ver`→`puede ver`; `te menciona`→`menciona al cliente`. Caso fuente: SKY 2026-07-11.
- **Output:** oferta técnica final redactada.
- *Skill:* `copywriting` (craft); tono es-CL / tokenización de copy de producto → `greenhouse-ux-writing` cuando aplique.

### Fase 8 — Oferta económica formal
- Arma la **planilla económica** en el formato exigido. Si la plataforma no entrega planilla, Efeonce diseña una limpia (ítems, condiciones de pago, notas). Coherencia aritmética total.
- **Output:** planilla económica lista.
- *Companion:* `propuesta-tecnica-economica.md` (§económica).

### Fase 9 — Empaquetado, matriz final y export
- Re-corre la **matriz de cumplimiento** (todos los excluyentes ✅). Maqueta y **exporta a PDF** (formato Wherex). Reúne anexos y declaraciones.
- **Output:** paquete completo listo para subir.
- *Companion:* `propuesta-tecnica-economica.md` (checklist "listo para presentar").

#### ⚠️ `audience`: la regla que evita el peor error de esta fase

Todo artefacto del bid es **`internal`** o **`client_facing`**. **Sólo lo `client_facing` y aprobado se
empaqueta.** Lo interno **NUNCA** se promueve por default — y acá no es un tema de permisos: es
entregarle a la contraparte munición contra ti.

| Artefacto | `audience` | Por qué |
|---|---|---|
| Oferta técnica · económica · deck · anexos | `client_facing` | Es lo que evalúa el comité |
| **Squad blueprint** | **`internal`** | Lleva el **loaded cost** por rol: es tu estructura de costos |
| **Diagnóstico interno** (lente técnica del Be X) | **`internal`** | Al cliente va **sólo la lente medida** (Fase 4-bis) |
| Scoring bid/no-bid, walk-away, margen | **`internal`** | Revela tu piso de negociación |

**NUNCA** adjuntes al paquete un archivo que no hayas clasificado explícitamente. Cuando exista el
runtime (`tender_assets`, **TASK-1392**), la regla la refuerza la DB; hoy la refuerzas tú.

### Fase 9.5 — Revisión crítica multi-lente (QA antes de cerrar)

Antes de dar la propuesta por lista, pásala por **tres lentes** que suelen exponer huecos que el redactor no ve:

- **Comercial/GTM (`commercial-expert`):** ¿de-riesga la indecisión del comité (JOLT: 40-60% de las pérdidas son indecisión, no el competidor)? → sumar un **plan 30-60-90 con quick win** y un **hook de diagnóstico** (Challenger "teach"). ¿Conecta el entregable con el **negocio del cliente** (no solo tráfico/vanity)? ¿El precio está **empaquetado en tramos** para anclar valor (Ramanujam) o es un número solo? ¿Preempta al **proveedor barato** con framing TCO?
- **Talent (`client-squad-design`):** ¿el squad es **real** o hay roles `[EST]` que sostienen el diferencial central sin persona confirmada? ¿Se corrió el **gate de capacity** (over-allocation = riesgo de SLA/penalidad)?
- **Finance (`greenhouse-finance-accounting-operator`):** ¿el loaded cost está **completo** (statutory Chile + utilización 60-75% + overhead real, no bruto×1,3)? En contrato **precio-fijo sin reajuste**, ¿hay **buffer FX+inflación** para no perder margen en años posteriores? ¿Modelado el margen del **último año**, no solo el mes 1?

Regla: si las tres lentes no pasaron, la propuesta **no está lista** aunque el texto se lea bien.

### Fase 9-bis — El deck (composición, no diseño)

**Cargar `deck-visual-system.md`.** El deck de la propuesta (técnica o de presentación ejecutiva)
**se compone desde un catálogo cerrado de 28 plantillas** — **nunca** se dibuja freehand. Se elige la
plantilla por el tipo de contenido (selector determinista, `registry.json`) y se rellenan sus slots.

Las que **puntúan o evitan el descarte** son T1 y no son opcionales: **matriz de cumplimiento**
(`RequirementsTableFull` — evita el descarte), **cronograma** (`TimelineFull`), **equipo**
(`TeamSplit` — el evaluador cruza CV vs requisito) y **económica** (`PricingFull`).

Reglas duras que se cruzan con este playbook:

- **Cifras:** reales del bid o **ilustrativas marcadas**. Nunca fabricadas (principio 4, anti-humo).
- **Equipo: fotos REALES, nunca caras IA.** El evaluador cruza el CV contra la persona → una cara
  fabricada es **tergiversación**, no un tema estético (ver `compliance-riesgo-integridad.md`).
- **Registro institucional (de usted)** en todo lo client-facing.

### Fase 10 — Presentación human-in-control
- **La oferta la sube un humano** a la plataforma, con comprobante guardado. El agente/skill **prepara**; **nunca envía ni firma**. Confirmaciones sensibles (ej. "sin demandas contra el comprador") las valida el operador.

## Principios cross-cutting (aplican a todo el flujo)

1. **Admisibilidad antes que fit.** Un excluyente faltante deja fuera aunque el fit sea 10/10.
2. **Nunca GO sin margen** sobre loaded cost. Fit alto + margen negativo = NO-BID.
3. **Fundar con skills, no con memoria.** Cada fase se apoya en la skill de dominio y en datos reales (bases, contexto, nómina, casos).
4. **Evidence-first + anti-humo.** Cada claim se encadena a su mecanismo o su prueba citable.
5. **Human-in-control.** El agente prepara; el humano decide, firma y sube.
6. **Documentar mientras se itera.** Cada mejora del método se refleja en este playbook + docu + manual (ver abajo).

## Mapa de orquestación (qué skill en qué fase)

| Fase | Skill / companion principal |
|---|---|
| 0 Intake/bases | esta skill · `chile-publico-operativo.md` (si público) |
| 1 Admisibilidad | `compliance-riesgo-integridad.md` |
| 2 Bid/no-bid | `bid-lifecycle-go-no-go.md` · `commercial-expert` |
| 3 Contexto/diferenciadores | `efeonce-agency` · `docs/context/` · `research-benchmark-operator` |
| 4 Alcance/método | skill de dominio (`content-marketing-studio`, `seo-aeo`, `digital-marketing`, `growth-marketing-cro`…) |
| 5 Squad | `greenhouse-talent-people-operator` (`client-squad-design.md`) |
| 6 Pricing | `pricing-garantias-finance.md` · `greenhouse-finance-accounting-operator` |
| 7 Redacción | `copywriting` · `greenhouse-ux-writing` |
| 8 Económica | `propuesta-tecnica-economica.md` |
| 9 Empaquetado/export | `propuesta-tecnica-economica.md` |
| 10 Presentación | humano (regla dura) |

## Norte: hacia una plataforma agéntica de licitaciones

Este método manual es el **precursor de un producto**: una plataforma agéntica —con tools— para construir licitaciones, decks y propuestas económicas de punta a punta. Los **layouts ya existen en Figma** (heads-up del operador, jul-2026).

Implicación de diseño (para cuando se implemente): **cada fase de este playbook se vuelve una capability con contrato programático gobernado**, no lógica atrapada en una UI. Leer bases, correr admisibilidad, correr el grader + escalera Be X, diseñar el squad, calcular pricing sobre loaded cost, redactar, armar la económica y el deck → cada una un primitive canónico en `src/lib/**` que **la UI (los layouts Figma), Nexa y MCP** consumen por igual. Es la doctrina **Full API Parity** de Greenhouse aplicada al dominio comercial: un motor, muchos consumers; los writes sensibles (enviar, firmar, publicar) siguen el loop de acción gobernada `propose → confirm → execute` con el humano en el punto de confirmación (coherente con la Fase 10, "human-in-control").

Regla para no perder el plano: **cada mejora del método manual documentada aquí es un requisito del producto futuro**. Documentar el método hoy = escribir la especificación funcional de ese runtime.

**Ya no es futuro abstracto — hay runtime y hay plan (2026-07-12):**

| Pieza | Estado | Qué es |
|---|---|---|
| **Artifact Composer (Fase 9-bis)** | ✅ **Shipped** (TASK-1393) | Motor domain-free en `src/lib/artifact-composer/**`; el deck es el catálogo `deck-axis` (28 plantillas + selector + brand pack + fuentes herméticas). CLI exploratorio: `pnpm deck:compose`. Ver `deck-visual-system.md` |
| **Aggregate `Proposal` (F0)** | ✅ **Shipped** (TASK-1392) | `greenhouse_commercial.proposal*`: state machine EN DB (gates humanos que la DB misma exige), RFP/evidencia/requisitos por asset store, entitlement per-ORG, API parity, **Proposal Intake Agent** |
| **Renderer productivo** | ✅ **Code-complete** (TASK-1391; staging deploy pendiente) | `requestProposalRender` → cola con prioridad deadline+aging → Cloud Run Job `artifact-worker` (Chromium pinneado) → PDF versionado en asset store. **La propuesta SKY real ya salió por este camino** |
| **Manual de USO y EVOLUCIÓN** | 📖 | **`proposal-studio-runtime.md`** — lo primero que lee un agente nuevo: las 6 recetas de uso + las costuras de extensión |

**Cómo se vuelve agéntico (y cómo NO) — YA IMPLEMENTADO ×2.** El molde es: contexto read-only
allowlisted → **propuesta tipada que cita sus inputs y DECLARA sus bloqueos** → validación
fail-closed que recomputa contra el contexto → **el humano confirma** → corre el **mismo command**
que usarían API, CLI, Nexa y MCP → **eval fixture como gate del prompt**. Existen dos instancias
vivas para copiar: `intake-agent.ts` y `render-agent.ts`. **Propuesta ≠ ejecución.** El LLM
**nunca** escribe estado (en la DB ni existe `actor_kind='agent'`). Toda fase futura de este
playbook (admisibilidad F1, económica, redacción) se agentiza copiando ese molde — nunca con un
prompt suelto ni un tool con acceso a DB/storage.

**NUNCA** se introduce LangChain, LangGraph ni un Agents SDK: se reusa el cliente canónico `src/lib/ai/` y el patrón tool-use de Nexa. **NUNCA** un prompt que escriba SQL o mute estado — eso no es "agentic", es un agujero.

Arquitectura: `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (**leer su §0 = estado real**) · invariantes: `agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`.

## Documentación viva (obligatorio al iterar)

Este método es **vivo**: cada vez que se construye o mejora una licitación, se sincroniza en **tres planos** (contrato de documentación de plataforma):

- **Skill (fuente de verdad del método):** este companion + los companions de etapa.
- **Documentación funcional (lenguaje simple):** `docs/documentation/comercial/construccion-de-licitaciones.md`.
- **Manual de uso (paso a paso):** `docs/manual-de-uso/comercial/construir-una-licitacion.md`.

Si el método cambia (nueva fase, nueva skill en la orquesta, nueva regla), actualiza los tres. No dejar el método solo en la cabeza de una sesión.

## Caso de referencia (primera destilación)

Primer caso end-to-end que produjo este playbook: **SKY Airline — Producción de Contenido Blog** (Wherex, jul-2026; cliente existente de Efeonce en otra área). Ejercitó las 10 fases + la Fase 4-bis:

- **Bases → admisibilidad → fit → diferenciadores** (Berel como caso SEO+AEO por Wherex, portal Greenhouse, Surround Discovery, WordPress + partner de Automattic).
- **Alcance (Fase 4):** `content-marketing-studio` + `seo-aeo` (cadencia pillar/cluster); **análisis del activo real** con Semrush (~13,5K keywords, ~40K visitas/mes, near-miss como Antofagasta 110K en pos 12) + **AI Visibility Grader real** (2 runs de 5 motores) + **benchmark de competencia** (JetSMART rival directo mismos destinos; LATAM lidera la conversación en IA; nadie ganó la carrera AEO).
- **Fase 4-bis (presentación del diagnóstico):** bullets duros (claridad de marca 100, **blog = 0 citas en 35 respuestas**, ownership 20 con LATAM 16 / JetSMART 9) + **informe público en vivo** incrustado + **escalera Be X con valores reales** (Ser encontrada 40 · Ser legible 70 · Ser correcta 37 · Ser accionable 8 · Ser intrínseca 76).
- **Squad (`client-squad-design`, ≈2,2 FTE) → pricing sobre loaded cost real de nómina → redacción + pase `copywriting` → económica → export.**

**Lecciones que este caso grabó en el método (aplican a toda licitación futura):**

1. **Mide, no infieras — y jamás afirmes un negativo falso.** La primera versión dijo "SKY casi no aparece en la IA / no es citada" a partir de sondas técnicas; el grader real lo desmintió (entity 100, SoV competitivo alto — SKY SÍ es citada y reconocida). Afirmar un negativo falso en una propuesta es grave. Corregir al dato medido.
2. **Si el instrumento sale parcial, arregla EL SISTEMA, no el informe.** Cuando el diagnóstico salió incompleto, el reflejo correcto no fue "maquillar el informe de este cliente" sino auditar el grader (parió `ISSUE-120` + `TASK-1390`: clasificador de fuentes, matching same-site, visibilidad de la degradación de prosa, backoff). Ajustar solo el informe habría dejado el gap oculto para los demás clientes.
3. **El informe completo lo arma el worker, no la mano.** Ver Fase 4-bis (regla de operación): `POST /score`/publish manual congela un informe sin tono ni categoría.
4. **Dos lentes del Be X no se contradicen** (Fase 4-bis): al cliente va la percepción medida; la técnica es munición interna.

Artefactos en la carpeta comercial de la licitación (borrador, oferta técnica + HTML con la escalera Be X, oferta económica, squad blueprint, diagnóstico interno). Cómo operar el grader: memoria `reference_ai_visibility_grader_how_to_run` + `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`.
