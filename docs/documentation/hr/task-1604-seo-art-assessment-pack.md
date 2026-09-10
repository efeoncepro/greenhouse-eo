# Pack de evaluación — SEO Specialist Senior y Director(a) de Arte Senior

## Estado y límites

Este documento versiona los instrumentos autorizados en `TASK-1604`. No activa preguntas, no asigna tests,
no crea postulaciones y no automatiza decisiones. Toda puntuación es evidencia advisory para una decisión
humana. La persona candidata puede pedir ajustes razonables en cualquier etapa.

La definición ejecutable vive en
`scripts/hiring/task-1604-role-assessment-pack.ts`. Las preguntas y rúbricas son internas; el payload público
del candidato usa la proyección allowlist del assessment engine y nunca contiene answer keys o rúbricas.

Las vacantes `EO-OPN-0674` y `EO-OPN-0675` fueron publicadas por un acto operativo separado el 2026-09-09.
Ese estado no activa la capa de assessment: el readback del 2026-09-10 confirma cero policies, cero instancias,
nueve preguntas todavía en `sme_review` y ningún template del pack materializado.

## Escala común

Cada dimensión se puntúa de `1` a `5` antes de calcular un promedio:

| Nivel | Ancla conductual | Conversión |
|---|---|---:|
| 1 | Respuesta genérica o riesgosa; no usa la evidencia disponible ni explicita decisiones. | 20 |
| 2 | Evidencia parcial; hay una dirección, pero faltan controles o prioridades importantes. | 40 |
| 3 | Respuesta viable y estructurada; usa evidencia suficiente, prioriza y reconoce límites. | 60 |
| 4 | Respuesta sólida y anticipatoria; conecta decisiones, colaboración y verificación. | 80 |
| 5 | Respuesta sobresaliente; integra evidencia, trade-offs, verificación y aprendizaje reusable. | 100 |

Un riesgo crítico no se compensa con buena presentación. La persona evaluadora puntúa cada dimensión por
separado, registra evidencia textual y distingue ausencia de evidencia de una conducta negativa.

## SEO Specialist Senior

### Diseño

- Método previsto: `candidate_test` seguido de conversación estructurada.
- Tiempo máximo: 75 minutos.
- Caso: completamente ficticio; no produce entregables para Efeonce ni para clientes.
- Herramientas: se permiten documentación, buscadores y AI si la persona declara el uso y verifica su aporte.
- Defensa: la entrevista puede introducir evidencia nueva para observar si la persona sostiene o corrige su
  decisión sin racionalización retrospectiva.

| Competencia | Peso | Evidencia principal |
|---|---:|---|
| Estrategia y diagnóstico SEO técnico | 30 | Hipótesis, orden de comprobaciones, prioridad, rollback y QA. |
| Arquitectura de contenido para SEO/AEO | 20 | Intención, entidades, arquitectura, evidencia, utilidad y citabilidad. |
| Medición y experimentación de búsqueda | 20 | Definiciones, calidad de datos, comparación, incertidumbre y decisión. |
| Investigación y síntesis editorial | 10 | Jerarquía de fuentes, grado de confianza y próxima evidencia. |
| Comunicación | 10 | Update ejecutivo con hecho, impacto, incertidumbre y acción. |
| Ownership y accountability | 10 | Contención, comunicación, recuperación y prevención sistémica. |

La selección del banco debe resolver dos preguntas para cada una de las tres competencias principales y una
para cada competencia de soporte. La plantilla no se materializa mientras esas nueve preguntas no estén
`active`: el resolvedor real omite preguntas no activas y dejar un template activo antes de SME produciría un
instrumento encogido.

### Calibración antes de activar

Dos SMEs responden de forma independiente usando una respuesta fuerte, una suficiente y una insuficiente por
pregunta. Se revisa acuerdo por dimensión, claridad del prompt, tiempo real y posibilidad de encontrar una
respuesta única por memorización. Si una pregunta premia extensión, jerga o conocimiento de una herramienta
específica por encima de la competencia, vuelve a `draft` mediante una nueva versión; no se ajusta la rúbrica
para justificarla.

## Director(a) de Arte Senior

### Diseño

- Método real: `interviewer_scorecard` con portfolio, profundización de casos y crítica de un artefacto
  ficticio.
- Tiempo máximo: 75 minutos.
- No hay prueba textual ni spec work. Se observa trabajo previo, decisiones, autoría y respuesta a restricciones.
- El runtime actual de `interviewer_scorecard` registra ratings directamente por competencia y no consume
  `template_id`; por eso la matriz queda versionada aquí y en código, no como un template activo desconectado.

| Competencia | Peso | Evidencia principal |
|---|---:|---|
| Dirección de arte | 25 | Tensión estratégica, territorios, decisión visual y contribución exacta. |
| Sistemas visuales multiformato | 25 | Invariantes, grados de libertad, adaptación y documentación. |
| Producción creativa y QA | 20 | Priorización, feedback, handoff, accesibilidad, derechos y cierre. |
| Liderazgo | 10 | Feedback que mejora criterio sin sustituir autonomía por control. |
| Comunicación | 10 | Recomendación defendible, trade-offs y gestión respetuosa del desacuerdo. |
| Ownership y accountability | 10 | Responsabilidad, recuperación y cambio sistémico verificable. |

Cada evaluador registra su scorecard antes de leer la síntesis de otras personas. Para cada caso debe separar
qué hizo la persona candidata, qué hizo el equipo, qué estaba fijado por el cliente y qué resultado es
atribuible. La ausencia de métricas no invalida por sí sola un proyecto visual; se evalúa si la persona definió
criterios observables apropiados al objetivo.

### Evidencia de portfolio

La persona puede anonimizar clientes, cifras y material confidencial. Si no puede mostrar una pieza, puede
explicar el problema, decisiones, artefactos no sensibles y referencias verificables. Nunca se penaliza no
revelar información protegida ni se solicita recrear trabajo confidencial.

## Decisión y fairness

- No se usan edad, nacionalidad, género, discapacidad, fotografía, acento ni proxies como evidencia de nivel.
- La fluidez de presentación no sustituye craft, razonamiento o impacto; se ofrecen formatos accesibles.
- El resultado numérico estructura la comparación, pero no produce auto-rechazo ni auto-contratación.
- La decisión final registra evidencia a favor, riesgos, incertidumbre y cualquier excepción humana.
- Tras el primer lote real, se revisan tiempo, abandono, desacuerdo entre evaluadores y relación entre cada
  pregunta y la evidencia observada; no se optimiza sólo por score promedio.

## Operación canónica

1. Validar el pack sin DB:
   `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/create-task-1604-assessment-pack.ts`.
2. Aplicar la migración por el runner gobernado.
3. Crear las preguntas SEO en `sme_review` con `--apply-questions`.
4. Realizar revisión y calibración SME por pregunta. La activación es una acción humana separada.
5. Sólo con las nueve preguntas exactas de este pack activas, materializar la plantilla SEO con
   `--materialize-seo-template`. El command falla ante templates homónimos con `roleHint`, módulos, niveles o
   pesos distintos, y también ante duplicados exactos.
6. No crear una policy de opening ni asignar assessments hasta un acto posterior expresamente autorizado.
