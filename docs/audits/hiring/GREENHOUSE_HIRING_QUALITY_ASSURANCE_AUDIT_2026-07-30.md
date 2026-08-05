# Greenhouse Hiring Quality Assurance — Auditoría 2026-07-30

## Estado

- Tipo: auditoría de diseño y contrato operativo
- Fecha: 2026-07-30
- Scope: Careers, Hiring/ATS, assessment, selección, onboarding, performance, workforce planning y economics de capacidad
- Evidencia: runtime y documentación vigentes del repositorio; caso Berel aportado por el operador
- Verdict: `design_gap_identified`
- Próximo artefacto: [Talent Assurance Decision V1](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md)

## 1. Problema observado

Efeonce vende capacidades traducidas en personas, infraestructura, herramientas, gobierno y continuidad. El cliente confía en Efeonce para:

1. contratar personal calificado;
2. asignarlo al contexto correcto;
3. sostener su desempeño y la experiencia del operador del cliente;
4. retener o reemplazar capacidad sin perder memoria;
5. demostrar por qué una persona, skill o portafolio puede considerarse `Verificado por Efeonce`.

En Berel, tres salidas en tres meses —dos Account Managers y un Content Creator— fueron despidos por falta de conocimiento y capacidad. El hecho no prueba un problema general de retención: prueba un proceso de selección insuficiente para esos roles.

El equipo de diseño, estable por aproximadamente un año, aporta evidencia de que Efeonce sí puede retener y estabilizar ciertas capacidades. La hipótesis vigente es que el gap es específico de selección, definición de rol, validación de capacidad y economics de algunas posiciones.

## 2. Hallazgos

### 2.1 Fortalezas existentes

- Careers y publicación de vacantes tienen flujo gobernado.
- Hiring modela `TalentDemand`, `HiringOpening`, `candidate_facet` y `hiring_application`.
- El assessment engine soporta competencias, niveles, pesos, work samples, preguntas situacionales, scorecards de entrevistador y revisión humana.
- La IA sigue el patrón `propose → confirm`; no decide contrataciones.
- El score assessment es advisory y queda separado de payroll/ICO.
- Existe historial append-only de decisiones y snapshot del assessment al momento de decidir.
- Existe un reader de validez score↔outcome, aunque todavía es analítico y con muestra insuficiente.

Fuentes: [Hiring/ATS Architecture](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md), [Hiring Desk](../../documentation/hr/hiring-desk.md), [TASK-1364](../../tasks/complete/TASK-1364-assessment-validity-feedback-loop.md).

### 2.2 Gaps load-bearing

1. La plantilla de assessment no queda vinculada de forma obligatoria a la vacante; la asignación ocurre por postulación y requiere acción operativa.
2. La decisión puede registrarse sin una evidencia mínima de capacidad; hoy se snapshottea `assessmentCount` y `score`, pero no existe un Quality Gate por rol.
3. No existe un contrato transversal que defina el significado, alcance, vigencia y evidencia de `Verificado por Efeonce`.
4. No existe una taxonomía operativa específica para `selection_failure` por falta de conocimiento/capacidad.
5. El feedback post-hire 30/60/90 no está conectado como cierre obligatorio del journey de Hiring.
6. La validez predictiva existe como reader backend, pero no como loop operativo visible para mejorar templates y decisiones.
7. El proceso comercial puede comprimir el presupuesto hasta volver inviable contratar y retener el nivel necesario.

### 2.3 Riesgo económico

Cuando el cliente exige alta capacidad, disponibilidad, coordinación y continuidad con un fee bajo, Efeonce puede terminar eligiendo entre:

- sacrificar margen;
- bajar seniority sin ajustar la promesa;
- aumentar presión sobre Recruiting;
- aceptar una selección débil;
- quemar al equipo existente;
- o incumplir la promesa de calidad.

La solución no es competir pagando menos por la misma promesa. Es reducir costo de servir, modular alcance, cambiar composición, usar build/borrow cuando corresponda o no aceptar la oportunidad.

## 3. Decisión que debe formalizarse

Crear `Efeonce Talent Assurance` como la capa que sostiene `Verificado por Efeonce`. `Hiring Quality Assurance` es un subsistema de entrada, no el nombre completo de la promesa.

El sello debe ser acotado por skill, nivel, rol, contexto, evidencia, fecha, verificador, vigencia y límites. No debe significar que una persona es universalmente apta ni que nunca cambiará.

La promesa de continuidad debe ser de capacidad gobernada: Efeonce garantiza evidencia, accountability, memoria, backup y reemplazo proporcional al contrato.

## 4. Modelo operativo propuesto

```text
TalentDemand
→ viabilidad de capacidad y economics
→ perfil de rol + competencias críticas
→ assessment + work sample + entrevista estructurada
→ evidencia mínima y decisión humana
→ HiringHandoff + onboarding
→ evaluación 30/60/90
→ outcome de calidad de contratación
→ renovación de verificación y aprendizaje del template
```

## 5. Gate comercial y de workforce

Antes de publicar una vacante o comprometer una capacidad, validar:

- estándar mínimo del rol;
- seniority y dedicación;
- disponibilidad de talento reclutable;
- loaded cost y costo de continuidad;
- backup, QA, management y soporte;
- piso de margen;
- alcance, cadencia y SLA compatibles con el fee;
- alternativa `build`, `buy` o `borrow`;
- plan de reemplazo y memoria.

Si el presupuesto no permite cumplir el estándar, se debe subir el fee, reducir alcance, cambiar la composición o rechazar la oportunidad. No se debe bajar silenciosamente la calidad.

## 6. Backlog recomendado

Las siguientes piezas deben convertirse en tasks con IDs formales antes de implementación:

1. Quality Gate por opening/application y template recomendado u obligatorio.
2. Templates específicos para Account Manager y Content Creator.
3. Taxonomía de decisión y salida, incluyendo `selection_failure`.
4. Journey post-hire 30/60/90 vinculado a la application.
5. Surface de quality-of-hire y validez por template/competencia.
6. Evidence ledger y estados de `Verificado por Efeonce`.
7. Recruitability & Quality Feasibility Check previo a publicar una demanda.
8. Pricing/capacity guardrails para Fully Managed Creative Capacity y Embedded Managed Pod.

## 7. Límites de esta auditoría

Esta auditoría no afirma que todos los templates actuales sean insuficientes ni que toda salida de Berel tenga una sola causa. Debe revisarse el contenido real de cada template, sus resultados y las economics de cada cuenta antes de fijar thresholds.

