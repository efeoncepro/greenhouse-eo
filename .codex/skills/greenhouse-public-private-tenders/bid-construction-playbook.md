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

### Fase 9.5 — Revisión crítica multi-lente (QA antes de cerrar)

Antes de dar la propuesta por lista, pásala por **tres lentes** que suelen exponer huecos que el redactor no ve:

- **Comercial/GTM (`commercial-expert`):** ¿de-riesga la indecisión del comité (JOLT: 40-60% de las pérdidas son indecisión, no el competidor)? → sumar un **plan 30-60-90 con quick win** y un **hook de diagnóstico** (Challenger "teach"). ¿Conecta el entregable con el **negocio del cliente** (no solo tráfico/vanity)? ¿El precio está **empaquetado en tramos** para anclar valor (Ramanujam) o es un número solo? ¿Preempta al **proveedor barato** con framing TCO?
- **Talent (`client-squad-design`):** ¿el squad es **real** o hay roles `[EST]` que sostienen el diferencial central sin persona confirmada? ¿Se corrió el **gate de capacity** (over-allocation = riesgo de SLA/penalidad)?
- **Finance (`greenhouse-finance-accounting-operator`):** ¿el loaded cost está **completo** (statutory Chile + utilización 60-75% + overhead real, no bruto×1,3)? En contrato **precio-fijo sin reajuste**, ¿hay **buffer FX+inflación** para no perder margen en años posteriores? ¿Modelado el margen del **último año**, no solo el mes 1?

Regla: si las tres lentes no pasaron, la propuesta **no está lista** aunque el texto se lea bien.

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

## Documentación viva (obligatorio al iterar)

Este método es **vivo**: cada vez que se construye o mejora una licitación, se sincroniza en **tres planos** (contrato de documentación de plataforma):

- **Skill (fuente de verdad del método):** este companion + los companions de etapa.
- **Documentación funcional (lenguaje simple):** `docs/documentation/comercial/construccion-de-licitaciones.md`.
- **Manual de uso (paso a paso):** `docs/manual-de-uso/comercial/construir-una-licitacion.md`.

Si el método cambia (nueva fase, nueva skill en la orquesta, nueva regla), actualiza los tres. No dejar el método solo en la cabeza de una sesión.

## Caso de referencia (primera destilación)

Primer caso end-to-end que produjo este playbook: **SKY Airline — Producción de Contenido Blog** (Wherex, jul-2026). Ejercitó las 10 fases: lectura de bases → admisibilidad → fit (cliente existente, otra área) → diferenciadores (Berel, SEO+AEO, portal, Surround Discovery) → alcance vía `content-marketing-studio` + `seo-aeo` (8 art/mes, pillar/cluster) → squad (`client-squad-design`, ≈2,2 FTE) → pricing sobre loaded cost real de nómina → redacción + pase `copywriting`. Artefactos en la carpeta comercial de la licitación (borrador, oferta técnica, squad blueprint).
