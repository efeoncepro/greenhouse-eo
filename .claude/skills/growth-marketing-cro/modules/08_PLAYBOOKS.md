# 08 · Playbooks (end-to-end)

> Secuencias ejecutables que combinan los otros módulos. Cada una: objetivo →
> pasos → artefacto → cómo se mide. Adáptalas al intake (`SKILL.md §2`), no las
> apliques a ciegas.

---

## A. Optimizar un sitio web / landing (CRO end-to-end)

**Objetivo:** subir la tasa de conversión de una página/flujo con evidencia.

1. **Define la conversión y mídela.** Una acción primaria por página; baseline actual
   y volumen (¿hay tráfico para testear? → `04` gate).
2. **Research** (`03 §0`): analytics (dónde caen) + heatmap/session replay (qué hacen)
   + encuesta on-site/reviews (qué piensan). Escribe la voz del cliente.
3. **Teardown heurístico** con LIFT (`templates/landing-page-teardown.md`): propuesta de
   valor, relevancia con la fuente, claridad, ansiedad, distracción, urgencia.
4. **Chequea los fundamentos de conversión** (`03`): above-the-fold (value prop + trust +
   message match), un solo objetivo, trust/social proof donde vive la duda, velocidad
   (CWV: LCP<2.0s, INP<200ms), formularios/checkout con mínimo de campos.
5. **Prioriza con PXL** el backlog de cambios.
6. **Ejecuta:** cambios de alta confianza → implementar (con `forms-ux`/`modern-ui`/
   `greenhouse-ux-writing` + GVC); cambios inciertos con tráfico → A/B (`04`).
7. **Mide** contra la primaria + guardrails (calidad de lead, revenue/sesión). Itera.

**Salida:** teardown + backlog PXL + 2–3 cambios/experimentos + plan de medición.

---

## B. Lanzar un lead magnet (top-of-funnel loop)

**Objetivo:** capturar demanda con una herramienta/recurso de valor que alimente el funnel.

1. **Oferta:** ¿qué valor real entrega sin fricción? (diagnóstico, calculadora, informe).
   Debe conectar con el problema del ICP y con el servicio que monetiza (loop content/viral).
2. **Landing** (playbook A): propuesta de valor clara, prueba, formulario mínimo (email
   primero; enriquece después), sin distracción.
3. **Gate de datos:** pide lo mínimo; si necesitas email corporativo, gatéalo con razón
   (no como fricción gratuita). Respeta PII/consentimiento (`07` + overlay Ley 21.719).
4. **Handoff a CRM:** el lead entra al lifecycle (`06`) y, si aplica, a pipeline
   (`commercial-expert`). Instrumenta el evento en el tracking plan (`07`).
5. **Loop:** ¿el output es compartible/citable? (resultado con marca, informe público)
   → alimenta content/viral loop (`02`).
6. **Mide:** conversión visita→lead, calidad del lead (activa/avanza), CAC del canal,
   contribución al pipeline.

**En Greenhouse esto es real:** el AEO/AI Visibility Grader es exactamente este patrón
→ `efeonce/AEO_GRADER_AS_LEAD_MAGNET.md`.

---

## C. Construir un growth model

**Objetivo:** una hoja simulable que conecte palancas → NSM → revenue.

1. Define la **NSM** y descompónla en inputs accionables (`01 §2`).
2. Mapea el **loop dominante** y su velocidad/amplificación (`01 §1`).
3. Arma el modelo por período (adquisición → activación → retención → referral →
   revenue) con tus tasas reales (`templates/growth-model-canvas.md`).
4. **Análisis de sensibilidad:** mueve cada palanca ±X% → efecto en NSM/ARR a 12–24m.
5. Prioriza las 3 palancas de mayor apalancamiento (a menudo retención/activación).
6. Ata cada palanca a un módulo de ejecución (`02`–`06`) y a su medición (`07`).

---

## D. Diagnosticar un funnel con fugas

**Objetivo:** hallar y priorizar dónde se pierde el crecimiento.

1. Instrumenta/lee el funnel AARRR con números por etapa (`07`).
2. Calcula `caída × volumen` por paso → la fuga de mayor impacto absoluto.
3. **¿Retención rota?** Si la curva no se aplana (`01`, `06`), esa es la fuga raíz —
   arréglala antes que adquisición.
4. Diagnostica la etapa foco: adquisición (`02`), conversión (`03`), activación (`05`),
   retención (`06`).
5. Hipótesis priorizadas (ICE/RICE/PXL) + plan de experimento/cambio + medición.

**Salida:** `templates/funnel-diagnosis-worksheet.md`.

---

## E. Correr un experimento (con honestidad estadística)

1. Gate de tráfico (`04 §1`). Si no da → alternativa (alta confianza / CUPED / cuali).
2. **Brief** (`templates/experiment-brief.md`): hipótesis causal, primaria, guardrails,
   MDE, sample size, duración, unidad, regla de decisión — **antes** de correr.
3. Método (frecuentista/bayesiano/secuencial); CUPED si hay datos históricos.
4. Corre ≥1–2 ciclos semanales; chequea SRM; sin peeking en fixed-N.
5. Decide por primaria **y** guardrails **y** impacto de negocio; documenta (incl. perdedores).

---

## F. Message-market fit (antes de optimizar píxeles)

**Objetivo:** encontrar el ángulo de mensaje que resuena con el segmento.

1. **Voz del cliente:** reviews, entrevistas, encuestas, tickets → lenguaje literal,
   dolores, "jobs to be done".
2. **Mapea** propuesta de valor por segmento (`templates/icp-message-market-fit.md`):
   problema → beneficio → prueba → objeción.
3. Prueba ángulos de mensaje (headline/oferta) en canales de bajo costo antes de
   rediseñar la página.
4. El ganador se vuelve el eje del above-the-fold (`03`); el wording final con
   `greenhouse-ux-writing`.

---

## G. Reducir churn / subir retención

1. Separa churn voluntario vs involuntario (`06`).
2. **Dunning** para el involuntario (quick win: recupera 50–80%).
3. Para el voluntario: halla el activation/engagement event que retiene (`05`, `06`),
   detecta señales tempranas de riesgo, interviene proactivo.
4. Lifecycle por comportamiento (`06`) con email sano (SPF/DKIM/DMARC, spam <0.10%).
5. Mide NRR/GRR + curva de retención por cohorte (M3+).

---

## Cómo elegir playbook (rápido)

| El operador pide… | Playbook |
|---|---|
| "mejorar la conversión del sitio/landing" | **A** |
| "lanzar/optimizar el lead magnet" | **B** (+ overlay grader) |
| "cómo crecemos / modelo de crecimiento" | **C** |
| "no sé dónde se cae la gente" | **D** |
| "quiero testear X" | **E** |
| "el mensaje no pega / no sé qué decir" | **F** |
| "se nos va la gente / churn alto" | **G** |

## Cross-links

- Todos los módulos `01`–`07`; artefactos en `templates/`
- Caso del sitio público Efeonce → `efeonce/CRO_PUBLIC_SITE.md`
- Errores transversales → `ANTIPATTERNS.md`
