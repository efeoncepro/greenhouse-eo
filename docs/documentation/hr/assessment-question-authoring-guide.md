# Guía de autoría de preguntas de assessment (SME)

> **Tipo de documento:** Documentacion funcional + guía operativa
> **Version:** 1.0
> **Creado:** 2026-07-10 por Claude (TASK-1384)
> **Ultima actualizacion:** 2026-07-10 por Claude (TASK-1384)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) §Assessment

## Para quién es esto

Para el **experto de skill (SME)** que revisa y aprueba preguntas del banco de assessment, y para quien redacta borradores. Tu aprobación es lo único que activa una pregunta: la IA y los agentes solo proponen borradores.

## El principio (por qué work-sample-first)

La evidencia en selección (Sackett et al. 2022) es clara: **lo que mejor predice desempeño es ver a la persona hacer (una muestra) del trabajo real**, no preguntarle qué sabe. Por eso el orden de preferencia al autorar es:

1. **Work sample** (`open_text`): "haz una versión pequeña del trabajo" — redacta el email, critica este copy, arma el plan.
2. **Situacional** (`situational`): "estás en esta situación real del rol, ¿qué haces y por qué?" — juicio aplicado.
3. **Conocimiento** (`single_choice`/`multi_choice`/`likert`): solo para fundamentos verificables (nivel `nociones`) o como complemento rápido. Nunca como columna vertebral de una competencia `intermedio`+.

## Anatomía de una buena pregunta

- **Anclada al rol real**: la situación/artefacto debe poder ocurrir en Efeonce (cliente, campaña, sprint, proveedor). Si no le pasaría a la persona en el cargo, fuera.
- **Un solo constructo**: mide UNA competencia. Si evalúa dos cosas, son dos preguntas.
- **Autocontenida**: todo el contexto necesario está en el enunciado; no depende de conocer clientes internos ni jerga Efeonce no explicada.
- **Rúbrica contestable** (abiertas/situacionales): 3-4 criterios observables tales que **dos correctores distintos lleguen al mismo puntaje**. Cada criterio dice qué se ve en una respuesta fuerte vs débil. Si tu rúbrica dice "buena comunicación" sin describir qué observar, no está lista.
- **Answer key inequívoco** (choice): una respuesta correcta defendible; los distractores son errores *plausibles* que alguien sin la competencia cometería (no opciones absurdas).
- **Nivel honesto**: `nociones` = reconoce conceptos y su aplicación básica; `intermedio` = resuelve situaciones típicas del rol con criterio propio; `avanzado` = maneja ambigüedad, trade-offs y a otros.

## Competencias actitudinales = comportamiento observable (Operating Code)

Lo actitudinal (`composure_pressure`, `ownership`, etc.) NUNCA se evalúa como afinidad o personalidad. Se evalúa como **comportamiento observable** alineado al [Operating Code](../../operations/EFEONCE_OPERATING_CODE_V1.md): transparencia (muestra estado/riesgos con contexto), memoria (deja aprendizaje reutilizable), impacto (conecta con el negocio), sistema (reduce fragmentación). Formatos válidos: situacionales con trade-off real, o conductuales de experiencia pasada ("cuéntame una vez que…" con rúbrica STAR: Situación-Tarea-Acción-Resultado).

## Sesgos y contenido prohibido (checklist antes de aprobar)

- ❌ Nada que sea **proxy de clase protegida**: edad ("nativo digital"), género, origen, estado civil, apariencia, religión, situación socioeconómica ("¿tienes auto propio?").
- ❌ Nada de "fit cultural" difuso ("¿te gusta el ambiente joven?") — solo comportamiento job-related.
- ❌ Nada que exija contexto local no relevante al rol (modismos, referencias que un candidato internacional competente no tendría).
- ❌ Emotion recognition, tests de personalidad encubiertos, o cualquier cosa que puntúe rasgos en vez de trabajo (prohibido por diseño y por EU AI Act).
- ❌ Enunciados con doble negación, trampas de lectura o adornos que midan comprensión lectora en vez de la competencia.
- ❌ **Usar los ejemplos de ESTA guía como ítems del banco**: la guía circula entre revisores y agentes — un ejemplo publicado es una pregunta filtrada (lección del review del lote 1: dos borradores copiaban los ejemplos verbatim y fueron retirados).

## El flujo (quién hace qué)

1. **Borrador** (`draft`): lo redacta un agente, la IA (propose→confirm de TASK-1361) o un humano — vía `createQuestion`, siempre nace draft.
2. **Revisión SME** (`sme_review`): TÚ validas contra esta guía: ¿anclada al rol? ¿rúbrica contestable? ¿checklist de sesgos limpia? ¿nivel honesto? Editas el borrador si hace falta (las preguntas draft son editables; una vez ACTIVA y usada, es inmutable — se retira y versiona).
3. **Activación** (`active`): solo tras tu aprobación (`transitionQuestionStatus` — queda registrado quién). La pregunta entra al pool asignable.
4. **Retiro** (`retired`): si una pregunta se filtra, envejece o mide mal → se retira, nunca se borra (los assessments históricos la referencian).

## Matriz de cobertura vigente

La matriz (qué competencias × niveles × cuántas preguntas activas) vive en `scripts/hiring/question-bank-matrix.ts` y el avance se verifica con:

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/question-bank-coverage.ts
```

**Lote 1 — Account Manager L2** (vacante real EO-OPN-0009): 9 competencias del template, target 3 activas en módulos core (relación con cliente, acumen comercial, copywriting, compostura, liderazgo, ownership) y 2 en soporte (SEO nociones, vendor management nociones, coordinación de entrega).

## Ejemplos (bueno vs malo)

**❌ Malo (conocimiento disfrazado, sin ancla):** "¿Qué es la comunicación efectiva? a) escuchar b) hablar claro c) ambas d) ninguna" — no mide nada del rol, opciones absurdas.

**✅ Bueno (work sample, `client_relationship_comm`):** "El cliente escribió molesto: la campaña salió con un error en el precio y lo detectó él, no nosotros. Redacta el mensaje de respuesta (máx. 200 palabras)." Rúbrica: (1) reconoce el error sin excusas ni culpar a terceros; (2) explica la corrección concreta y el plazo; (3) propone el mecanismo para que no se repita; (4) tono profesional que preserva la relación.

**✅ Bueno (situacional actitudinal, `ownership`):** "Detectas que una pieza aprobada por el cliente tiene un dato desactualizado. La publicación es en 2 horas, quien la aprobó no responde y técnicamente 'no es tu tarea'. ¿Qué haces, en qué orden y a quién informas?" Rúbrica: (1) actúa sin esperar dueño formal; (2) contiene el riesgo primero (detener/corregir) antes de buscar culpables; (3) comunica con transparencia a cliente/equipo; (4) deja aprendizaje para el sistema.

## Referencias

- Doctrina de assessment: skill `greenhouse-talent-people-operator` (`references/assessment-interviewing.md`)
- Task del banco: `docs/tasks/complete/TASK-1384-assessment-question-bank-sme-v1.md`
- Fairness (próximo): `docs/tasks/to-do/TASK-1365-assessment-adverse-impact-fairness-monitoring.md`
