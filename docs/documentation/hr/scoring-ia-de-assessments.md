# Scoring IA de Assessments — corrección asistida a escala con revisión humana

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-16 por Claude (TASK-1734)
> **Ultima actualizacion:** 2026-08-16 por Claude
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-16 (2)) · ADR [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md)

## Qué hace

Cuando un candidato termina su test, una plantilla real puede dejar diez respuestas abiertas por
corregir; una cohorte de 70 personas produce 700 correcciones manuales. Este sistema hace que la IA
**proponga** un puntaje para cada respuesta abierta de un test recién enviado, de forma automática y en
segundo plano, agrupando todo el test en un **run**: una unidad de trabajo con estado propio que se puede
revisar, confirmar, cancelar o revertir.

La IA nunca decide. Cada propuesta se clasifica por riesgo:

- **Revisión obligatoria** — casos dudosos (respuesta rara, evidencia débil, puntaje cerca del corte):
  un humano los corrige uno a uno.
- **Muestra de calidad (ciega)** — una muestra al azar donde el revisor puntúa **sin ver** la propuesta
  de la IA; sirve para vigilar que la IA no se desvíe.
- **Elegible por lote** — el resto puede confirmarse en conjunto, pero solo después de que la revisión
  obligatoria y la muestra ciega estén cerradas.

La confirmación del lote deja un **manifiesto permanente**: qué propuestas cubrió, qué muestra se revisó,
qué excepciones se resolvieron, quién confirmó y si el revisor vio la propuesta antes de puntuar. Un botón
"aceptar todo" sin esa evidencia no existe.

## Quién ve qué

- **El candidato no ve nada.** Solo ve que su test fue enviado. Nunca ve puntaje, resultado por
  competencia, propuestas de IA, explicaciones, nivel de confianza ni estado de revisión — ni en la
  página del test, ni por correo, ni en ninguna superficie pública o de cliente. Esto está prohibido por
  contrato (con tests que lo verifican) y **no tiene interruptor**: no hay configuración que lo habilite.
- **Solo operadores internos autorizados** (con el permiso de puntuar assessments) ven la cola de
  revisión, las propuestas y el estado del run.

## El gate humano

Ningún puntaje propuesto por la IA se vuelve oficial sin confirmación humana. Además, la capacidad
completa está bloqueada por un **gate de promoción**: antes de reducir la revisión humana, Talent debe
producir un set de casos calificados por **dos evaluadores humanos independientes** más adjudicación, y la
IA debe pasar esa vara. Un comando mecánico verifica ese requisito y bloquea la promoción si no se cumple;
ningún agente puede fabricar esas calificaciones.

## Estado actual: apagado

El sistema está **completo en código pero apagado en todos los ambientes** (2026-08-16). Los tres
interruptores nuevos están en OFF, el trabajo en segundo plano está pausado, y encenderlo sigue una
secuencia gradual documentada (sombra → canary → promoción) que requiere señal explícita del operador. Si
algo sale mal, existe un procedimiento de reversa que devuelve todo a la cola de corrección manual sin
perder ninguna respuesta.

> Detalle técnico: ADR [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) ·
> runbook de rollout [assessment-ai-scoring-rollout.md](../../operations/runbooks/assessment-ai-scoring-rollout.md) ·
> código `src/lib/hiring/assessment/ai/scoring-run/` · manual del operador
> [operar-scoring-ia-assessments.md](../../manual-de-uso/hr/operar-scoring-ia-assessments.md)
