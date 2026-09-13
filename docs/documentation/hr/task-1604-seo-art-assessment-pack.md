# Pack de evaluación — SEO Specialist Senior y Director(a) de Arte Senior

## Estado y límites

Este documento versiona los instrumentos autorizados en `TASK-1604`. La versión SEO está habilitada para
asignación manual en `EO-OPN-0674`; no crea postulaciones ni automatiza decisiones. Toda puntuación es
evidencia advisory para una decisión humana. La persona candidata puede pedir ajustes razonables en cualquier
etapa.

La definición ejecutable vive en
`scripts/hiring/task-1604-role-assessment-pack.ts`. Las preguntas y rúbricas son internas; el payload público
del candidato usa la proyección allowlist del assessment engine y nunca contiene answer keys o rúbricas.

Las vacantes `EO-OPN-0674` y `EO-OPN-0675` fueron publicadas por un acto operativo separado el 2026-09-09.
El 2026-09-13 se activó sólo el piloto manual SEO: template
`atpl-6621f306-cb50-4286-a41d-969927a579e3`, policy
`hoap-e7e269ac-2c2a-4023-8873-15db1302d63e`, `enabled/manual`, 75 minutos y cap de cinco asignaciones por
hora. Arte permanece fuera de este binding.

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

### Calibración y excepción autorizada de piloto

Para la validación completa del instrumento, dos SMEs responden de forma independiente usando una respuesta fuerte, una suficiente y una insuficiente por
pregunta. Se revisa acuerdo por dimensión, claridad del prompt, tiempo real y posibilidad de encontrar una
respuesta única por memorización. Si una pregunta premia extensión, jerga o conocimiento de una herramienta
específica por encima de la competencia, vuelve a `draft` mediante una nueva versión; no se ajusta la rúbrica
para justificarla.

### Afinación editorial 2026-09-13 — piloto manual habilitado

El operador revisó las nueve preguntas y manifestó que las ve bien; autorizó afinar los enunciados.
Se conservan competencias, pesos, método y tiempo total. Se aclaran contexto independiente, datos faltantes,
atribución de cambios y límites de recuperación. Las rúbricas de prioridad, medición, experimento y recuperación
se alinean con estas precisiones. Se permiten respuestas breves en listas o tablas, sin cuentas reales ni
herramientas de pago; los supuestos deben declararse. Los tiempos orientativos suman 69 minutos y quedan
6 minutos para lectura y revisión dentro del máximo de 75.

**Estado:** nueve preguntas afinadas activas para el piloto autorizado: ocho sucesores con originales retiradas
mediante `reviseUnpublishedQuestion` y una sin cambio. Preview contra IDs/digests originales y apply repetido
sin duplicados: [evidencia](../../audits/hiring/2026-09-13-seo-assignment-readiness.md).
La calibración descrita arriba sigue pendiente. El operador autorizó el 2026-09-13 el piloto manual con
aprobación editorial, sin declarar calibración independiente realizada. Plantilla y policy `enabled/manual`, 75 minutos, verificadas en la auditoría; la aprobación no autoriza asignaciones a personas ni comunicaciones.
Para repetir la sincronización usar `revise-task-1604-seo-questions.ts --apply`, no el cargador por texto.
El manifest fija la versión aprobada; cualquier afinación posterior requiere nueva revisión explícita.

#### Enunciados afinados

**1. Diagnóstico técnico · 10 minutos**

Caso ficticio. Un sitio B2B de 18.000 URLs perdió 34% de clics orgánicos de búsquedas que no incluyen la marca en seis semanas. Hubo una migración parcial de plantillas, aumentaron las URLs “Descubierta: actualmente sin indexar”, el sitemap incluye filtros y el equipo atribuye todo a una actualización de Google. Diseña un plan de diagnóstico para las primeras 48 horas. Ordena tus cinco primeras comprobaciones, indica qué evidencia buscarías, qué hipótesis podría confirmar o descartar cada una y qué cambio evitarías hacer todavía.

**2. Priorización técnica · 8 minutos**

Caso ficticio. Un sitio B2B perdió tráfico orgánico después de una migración parcial. Encuentras cuatro hallazgos: 4.000 URLs de filtros rastreables sin valor, canonical cruzado en 12 plantillas de alto tráfico, LCP móvil lento en todo el sitio y 160 enlaces internos rotos. Tienes capacidad de desarrollo para una sola intervención esta semana. Elige una intervención provisional, explica por qué la priorizas y qué dato podría cambiar tu decisión. Define cómo verificarías el resultado técnico y su impacto en búsqueda, y qué señal justificaría revertir el cambio. Máximo 300 palabras.

**3. Arquitectura SEO/AEO · 9 minutos**

Caso ficticio. Una empresa vende software para conectar los datos de marketing y ventas. Quiere ayudar a responsables de ambas áreas que buscan “cómo conciliar marketing y ventas”, pero hoy tiene cinco artículos solapados, una landing comercial y opiniones sin fuente. Propón una arquitectura de búsqueda y contenido que sirva tanto a personas como a motores y asistentes de IA. Incluye intención, entidades/subpreguntas, decisión de consolidar o separar, evidencia necesaria, enlaces internos, datos estructurados sólo cuando correspondan y siguiente paso de negocio.

**4. Jerarquía y utilidad de la página · 7 minutos**

Caso ficticio. Una página de una empresa de software busca ayudar a responsables de marketing y ventas a conciliar los datos de ambas áreas. Abre con 450 palabras de marca antes de responder, presenta una cifra sin fuente, usa seis H2 casi idénticos y cierra con “Contáctanos”. Sin redactar el artículo completo, propone el esquema de la primera pantalla y la jerarquía de secciones. No inventes la cifra ni resultados del producto. Explica qué conservarías, qué eliminarías y cómo comprobarías que la mejora responde mejor a la intención sin medir éxito sólo por posición. Máximo 250 palabras.

**5. Lectura de resultados · 9 minutos**

Caso ficticio. En las cuatro semanas posteriores a publicar un conjunto de páginas relacionadas (hub), frente a las cuatro anteriores, las impresiones en Search Console suben 40%, sus clics 8%, las sesiones orgánicas en GA4 3% y los leads atribuidos al canal orgánico bajan 5%. No tienes aún los volúmenes absolutos ni confirmación de que los informes cubran las mismas páginas. Diseña un plan de lectura antes de declarar éxito o fracaso. Prioriza tres comprobaciones iniciales: qué compararías, con qué fuente y qué podría explicar la diferencia. Indica qué ventana o comparación adicional necesitas y qué harías si encuentras un error de medición, un cambio en el tipo de tráfico o una caída real de conversión.

**6. Diseño de una comparación · 7 minutos**

Tienes diez páginas de temática, tráfico y tendencia similares, y capacidad para modificar sólo cinco. Diseña una comparación práctica para evaluar una nueva estructura de respuesta inicial y enlaces internos. Explica cómo seleccionarías las cinco páginas y qué conservarías sin cambios en las otras. Decide si evaluarás ambas mejoras como un conjunto o por separado, y qué podrás atribuir a cada una. Define una métrica principal, métricas secundarias, señales de daño y cómo decidirías la duración según el tráfico y el tiempo de rastreo e indexación. Explicita las limitaciones de trabajar con diez páginas, los factores de confusión y qué harías si el resultado no es concluyente. Máximo 300 palabras.

**7. Evaluación de evidencia · 6 minutos**

Para una recomendación SEO recibes: documentación oficial que describe una limitación, un estudio de proveedor con muestra no declarada, tres casos internos con resultados mixtos y una opinión viral. En máximo 220 palabras, ordena la evidencia, explica qué afirmarías hoy, qué no afirmarías y qué prueba adicional reduciría más la incertidumbre.

**8. Comunicación ejecutiva · 6 minutos**

Caso ficticio. Los clics orgánicos de un sitio B2B bajaron 34% en seis semanas y hubo una migración parcial de plantillas. La evidencia todavía no permite atribuir la caída a la migración ni cuantificar su impacto en leads. Debes informar a una dirección no técnica. Redacta un update de máximo 180 palabras con: hecho confirmado, incertidumbre, impacto, acción inmediata, decisión que necesitas y próxima fecha de evidencia. No inventes impacto ni una causa confirmada. Puedes proponer un plazo para la próxima actualización. No uses jerga sin explicarla.

**9. Respuesta a un incidente · 7 minutos**

Caso ficticio. Una recomendación tuya se implementó y 600 páginas valiosas quedaron con noindex durante 36 horas. Acabas de detectar el incidente. Describe qué haces en los primeros 30 minutos, durante el día y después de estabilizar. Incluye comunicación, contención, verificación, registro y cambio sistémico para evitar repetición. Distingue retirar la instrucción noindex de comprobar la recuperación de indexación y tráfico; no prometas plazos que no puedes controlar. No busques culpables.

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
4. Realizar revisión y calibración SME por pregunta. Para el piloto vigente, la aprobación editorial del
   operador permitió activar la versión sin afirmar que la calibración independiente ya ocurrió; la
   calibración completa sigue siendo un gate de calidad pendiente.
5. Sólo con las nueve preguntas exactas de este pack activas, materializar la plantilla SEO con
   `--materialize-seo-template`. El command falla ante templates homónimos con `roleHint`, módulos, niveles o
   pesos distintos, y también ante duplicados exactos.
6. Para el piloto vigente, la policy manual ya está habilitada para `EO-OPN-0674`. Asignar sólo mediante
   propose → confirm y con autorización humana por postulante; no activar `on_stage_entry` ni enviar a
   postulantes hasta que exista una autorización específica.
