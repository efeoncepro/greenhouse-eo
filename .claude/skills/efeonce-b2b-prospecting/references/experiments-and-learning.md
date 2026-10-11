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
| Cobertura | Objetivo investigado y número de adyacentes elegibles; encontrados ≠ correos accionables |
| Conversación útil | Respuesta humana pertinente/derivación/contexto vs cuentas contactadas según ventana |
| Próximo paso | Acuerdo bilateral con owner/fecha; reunión realizada distinta de agendada |
| Oportunidad | Criterio Commercial y evidencia, no Lead/stage/registro automático |
| Costo | Créditos consumidos, horas/preventa y gasto por cuenta/conversación/resultado con ventana |

Separar negativas, bajas, OOO, rebotes, respuestas automáticas y bots. Open/click son diagnósticos limitados
por scanners/precarga, nunca criterio de calidez. No declarar éxito por un unsubscribe o auto-reply.
Línea/país/canal/relación/fecha son cohortes locales de análisis, no schema nuevo. Evitar doble conteo de cuentas.

Conservar resultados, hipótesis refutada, explicación y próxima decisión. Volver a fuentes del provider cuando
cambie plan/campo/comportamiento; refrescar identidad/empleo y proceso antes de usar un dato histórico.
No “optimizar” eliminando cuentas sin evidencia favorable o ocultando cobertura incompleta.
