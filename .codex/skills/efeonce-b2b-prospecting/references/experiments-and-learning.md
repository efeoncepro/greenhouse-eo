# Evaluar decisiones y aprender

Evaluación local de la skill: ejecutar [escenarios](../evals/scenarios.json) sin herramientas externas ni PII real;
el evaluador recibe petición y evidencia mínima, no la [rúbrica](../evals/rubric.md) ni las respuestas esperadas.
Revisar el resultado contra hechos/permiso y registrar errores/reparaciones. Frontmatter/mirrors prueban estructura,
no capacidad de decisión. El pilotaje posterior no está autorizado por crear o validar esta skill.

## Experimento comercial, cuando se autorice

Definir cuenta objetivo, micro-ICP, hipótesis, criterio de selección, canal, mensaje/proof, frecuencia, parada,
owner y presupuesto. Verificar autenticación/reputación/bajas del rail real antes del envío con su owner.
Normas bulk de Gmail/Yahoo/Outlook tienen alcances distintos; no copiar un umbral a todo correo corporativo.
No cambiar DNS, suscripción o secuencias como efecto de redactar un plan.

Usar una tesis coordinada por cuenta; una sola variación relevante por comparación cuando sea viable.
Si se busca efecto causal, aleatorizar por cuenta y diseñar muestra desde baseline; no poner miembros de
una misma cuenta en variantes independientes. Un lote pequeño valida workflow/calidad, no uplift estadístico.
No importar cuotas, tasas o economics de estudios enterprise extranjeros como metas de Efeonce.

## Medir sin inflar

| Métrica | Denominador y evidencia |
| --- | --- |
| Elegibilidad | Cuentas investigadas vs cuentas con hard filters resueltos; mantener desconocidas |
| Personas | Objetivo y base de adicionales buscados/ampliación; personas únicas identificadas, elegibles, con acceso e involucradas, por separado |
| Cobertura funcional | Roles críticos para la decisión/fase con participación/autoridad contrastadas frente a los aplicables; desconocidos y no aplicables justificados |
| Brechas | Funciones críticas ausentes, riesgo, owner, ruta y siguiente validación; no declarar grupo completo por cantidad de emails |
| Conversación útil | Respuesta humana pertinente/derivación/contexto vs cuentas contactadas según ventana |
| Próximo paso | Acuerdo bilateral con owner/fecha; reunión realizada distinta de agendada |
| Oportunidad | Criterio Commercial y evidencia, no Lead/stage/registro automático |
| Costo | Personas con tarifa cargada, preventa, créditos, terceros y herramientas existentes/nuevas asignadas; costo total distinto de caja incremental, por cuenta/resultado y ventana |

Separar negativas, bajas, OOO, rebotes, respuestas automáticas y bots. Open/click son diagnósticos limitados
por scanners/precarga, nunca criterio de calidez. No declarar éxito por un unsubscribe o auto-reply.
Línea/país/canal/relación/fecha son cohortes locales de análisis, no schema nuevo. Evitar doble conteo de cuentas.

Conservar resultados, hipótesis refutada, explicación y próxima decisión. Volver a fuentes del provider cuando
cambie plan/campo/comportamiento; refrescar identidad/empleo y proceso antes de usar un dato histórico.
No “optimizar” eliminando cuentas sin evidencia favorable o ocultando cobertura incompleta.

## Medición account-based

Cargar [ABM y ABS](abm-and-abs.md) para selección/inversión, reputación, relaciones y resultados. Medir
criterios/hitos acordados, no decisión, contratos/ingresos/margen y retención/expansión; Spot/MRR/ARR
conservan unidades distintas. Pipeline influenciado es atribución, no prueba de ingreso incremental.
Cohortes de adquisición, expansión y relación se analizan separadas. Confirmar continuidad/costo después
de la ventana del piloto; mantener capacidad máxima sin forzar abandono al iniciar otra ola.

## Aprendizaje de cuenta e iniciativa

Usar [account-learning](../templates/account-learning.md) al revisar una respuesta, hito o desenlace.
Reutilizar expediente/hilo/HSP existentes. Separar ganada, perdida ante alternativa, no decisión/pospuesta
y resultado desconocido según evidencia; silencio no prueba pérdida, baja es restricción de contacto,
un piloto solicitado no es ganado. La calificación y actualización de stage pertenecen a Commercial/HubSpot
y requieren el alcance correspondiente, no se ejecutan como efecto de documentar aprendizaje.

Registrar motivo declarado por comprador y evidencia; análisis del equipo como hipótesis aparte. Permitir
varios factores (prioridad, consenso, fit, presupuesto, prueba, riesgo, proceso, capacidad o competencia),
sin taxonomía nueva automática. Una razón aislada no prueba causalidad ni autoriza descontar/alterar ICP.
Contrastar qué predijo la hipótesis, qué ocurrió y qué falta saber; conservar casos desfavorables y cohortes.

Cada dato del mapa tiene fuente/fecha, owner y condición de revisión. Una fecha de revisión elegida por
riesgo/ventana no convierte la información en vigente hasta entonces: nuevo empleo, bounce, cambio de
sponsor, iniciativa, proceso o señal contradictoria exige refrescar el dato afectado. Si faltan datos actuales,
mantener autoridad/email/acceso desconocidos; no caducar ni borrar el expediente completo por defecto.

Un trigger de presupuesto/cambio de función puede justificar nueva investigación acotada, no outreach.
HOLD/negativas prevalecen: revisión sólo en el evento/alcance permitido; no abordar colegas ni crear scheduler
para rodearlas. Derivación prometida no es introducción realizada. Con owner/fecha, entregar el próximo paso
al seguimiento existente; no crear una segunda automatización por cada mapa.

Cuando evidencia real contradice un comportamiento de la skill, anonimizar el mínimo caso, añadir escenario
y corregir el módulo dueño. Explicar alcance/muestra; no transformar una anécdota en cuota universal ni
un cambio documental en mejora demostrada de conversión. Repetir los escenarios afectados.
