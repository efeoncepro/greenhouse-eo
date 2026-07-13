# Operar Hiring Desk

## Antes de empezar

Necesitas una vista `gestion.hiring*` asignada y las capabilities correspondientes a la acción. El acceso a la pantalla no sustituye el permiso de leer, escribir, publicar, evaluar o decidir.

## Mapa operativo end-to-end

El flujo completo de Hiring es:

1. **Crear/publicar vacante**: Demand → Opening → Publication.
2. **Recibir postulación**: Careers público crea/reconcilia Person + `candidate_facet` + `hiring_application`.
3. **Revisar candidato**: Application 360 concentra resumen, documentos, assessment, decisión y actividad.
4. **Asignar assessment**: el operador asigna una plantilla lista a una postulación concreta. Esto crea una instancia con token.
5. **Candidato rinde**: el link `/assessment/<token>` abre la experiencia pública de evaluación.
6. **Operador corrige**: Application 360 muestra scorecard, cola de respuestas abiertas y drawer de corrección.
7. **Decidir**: la decisión humana queda en `Decisión`; el scorecard es advisory.
8. **Activar seleccionado**: `selected` + `internal_hire` genera/usa handoff y abre la Hiring Activation Lane.

## Modelo mental: plantilla, vacante, postulación e instancia

No se asigna un assessment "a la vacante" como ejecución directa. La vacante puede tener una plantilla recomendada para el rol, pero la ejecución real se crea **por postulación**.

- **Plantilla (`hiring_assessment_template`)**: el assessment listo/reutilizable, por ejemplo `Account Manager L2`. Define competencias, pesos y banco de preguntas.
- **Vacante/opening (`hiring_opening`)**: publica el rol y recibe postulaciones. Puede orientar qué plantilla usar, pero no rinde ni guarda respuestas.
- **Postulación (`hiring_application`)**: el candidato dentro del pipeline. Aquí se asigna el assessment.
- **Instancia (`hiring_assessment`)**: plantilla × postulación. Tiene estado, tiempo, token, respuestas y scorecard propios.

Esta separación permite que dos candidatos de la misma vacante tengan tokens, tiempos, accommodations, avances y scorecards independientes sin duplicar la vacante ni mezclar respuestas.

## Crear una demanda

1. Abre `/agency/hiring` y selecciona `Nueva demanda`.
2. Parte en blanco o usa una plantilla; revisa rol, área, seniority, skills, cupos, modalidad, fecha y resumen.
3. Usa `Crear demanda` para dejarla en borrador. Usa la opción dividida `Crear y publicar` solo cuando el contenido público esté completo.
4. Si intentas cerrar con cambios, elige `Seguir editando` o `Descartar`.

## Operar el pipeline

1. Abre `Pipeline` y filtra por opening o persona.
2. Mueve una tarjeta arrastrándola a otra lane, o abre `⋮` y elige la etapa con teclado.
3. Espera el feedback de guardado. Si aparece rollback, la tarjeta vuelve a la etapa anterior; reintenta cuando el servicio esté disponible.
4. Para seleccionar, rechazar o dejar en espera, abre la postulación y usa `Decidir`; no uses drag para outcomes terminales.

## Revisar una postulación

1. En `Resumen`, confirma opening, etapa, contacto enmascarado y señales advisory.
2. En `Evaluación`, asigna un test si hay plantilla activa. El token se muestra una sola vez. Comparte la URL limpia `/assessment/<token>` con el candidato por el canal autorizado.
3. En una evaluación respondida, abre `Revisar evaluación`, edita/confirma cada score humano o sugerencia IA y finaliza el scorecard cuando no queden respuestas pendientes.
4. En el scorecard, trata el resultado como señal advisory: usa barras/radar para leer competencias, pero la decisión final se registra en `Decisión`, no en el score.
5. En el drawer de corrección, lee primero pregunta, respuesta y rúbrica. La sugerencia IA aparece como apoyo posterior para evitar anclaje; nunca confirma sola.
6. En `Documentos`, usa enlaces públicos permitidos. No intentes revelar identidad hasta que TASK-1362 entregue resolver, capability, motivo y auditoría; el botón deshabilitado es intencional.
7. En `Decisión`, elige avanzar, rechazar o esperar; completa destino cuando aplique, razón y evidencia. Revisa el diálogo antes de confirmar.
8. Si seleccionas (`selected`) con destino `internal_hire`, revisa el bridge de handoff que aparece en la misma pestaña. Cuando el handoff esté pendiente y tengas `hiring.handoff.approve`, usa **Aprobar handoff**; cuando esté aprobado, usa **Abrir Activation Lane** para continuar en `HR → Onboarding & Offboarding → Contrataciones listas`.
9. Usa `Actividad` e `Historial de decisiones` para verificar la trazabilidad append-only.

## Asignar el assessment listo a un candidato

Usa este flujo para la vacante real publicada o cualquier opening activo:

1. Abre `Pipeline` o la lista de postulaciones y entra a la postulación real en `/agency/hiring/applications/<applicationId>`.
2. Abre la pestaña `Evaluación`.
3. Revisa si ya existe una instancia abierta para esa plantilla. Greenhouse evita duplicar instancias abiertas del mismo template en la misma postulación.
4. Usa `Asignar assessment`.
5. Selecciona la plantilla activa del rol. Para Account Manager, la plantilla vigente es `Account Manager L2`.
6. Define el tiempo límite si la UI lo permite; si no, conserva el default de la plantilla.
7. Confirma. Greenhouse crea la instancia `candidate_test`, genera token y deja la evaluación en estado asignado/enviable.
8. Copia inmediatamente el link `/assessment/<token>`. El token crudo se muestra una sola vez por seguridad; el backend guarda hash, no el token recuperable.
9. Envía el link por el canal autorizado con contexto mínimo: rol, fecha esperada, duración y soporte si necesita accommodation.
10. Vuelve a Application 360 para monitorear estado: asignado, en progreso, enviado, expirado o scored.

Si se perdió el token antes de enviarlo, no intentes recuperarlo desde SQL ni logs. Como el token crudo no es recuperable, la operación correcta es cancelar/reemitir cuando exista el command de reissue gobernado; hasta entonces, documenta el caso y coordina con quien tenga ownership del assessment runtime.

## Operar una evaluación de candidato

### Candidato

1. Abre `/assessment/<token>` en el ambiente correcto. La ruta `/public/assessment/<token>` existe como compatibilidad, pero la URL limpia es la preferida.
2. El candidato ve instrucciones, secciones, tiempo efectivo y, si aplica, una banda de accommodation por minutos extra.
3. El botón de inicio queda bloqueado hasta consentimiento. Al iniciar, arranca el timer.
4. Cada respuesta se guarda con autosave. El candidato ve feedback `Guardando…` / `Respuesta guardada`.
5. El envío es irreversible y exige que todas las preguntas del assessment público tengan respuesta guardada. El backend también bloquea submit incompleto.
6. Tras submit o expiración, la pantalla queda terminal; no se debe reabrir el link manualmente.

### Operador

1. En Application 360, pestaña `Evaluación`, usa `Revisar evaluación`.
2. Revisa el scorecard por competencia. `Puntaje global` y barras/radar son señales de apoyo, no veredicto.
3. Abre una respuesta pendiente desde la cola.
4. Corrige con la rúbrica visible antes de leer/confirmar cualquier sugerencia IA.
5. Ajusta o confirma puntaje humano y vuelve al scorecard.
6. Cuando no queden respuestas pendientes, finaliza el scorecard para que el rollup quede disponible en la decisión.

## Seleccionar y activar un candidato

La activación no ocurre al finalizar el assessment. El assessment alimenta la decisión; la decisión alimenta el handoff; el handoff alimenta la Hiring Activation Lane.

1. En Application 360, abre `Decisión`.
2. Registra `selected` sólo cuando la evidencia humana esté completa.
3. Si el destino es contratación interna, selecciona `internal_hire`.
4. Confirma la decisión con razón/evidencia. Greenhouse materializa el handoff real del dominio Hiring.
5. Si el handoff aparece `pending` y tienes permiso, usa **Aprobar handoff**. Si no tienes permiso, deja el estado visible para People Ops/HR.
6. Usa **Abrir Activation Lane**. El deep link lleva a `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...`.
7. En la lane `Contrataciones listas`, People Ops reclama el caso, crea/enlaza la ficha de colaborador, abre onboarding, resuelve blockers accionables y cierra sólo cuando Workforce Activation completó la ficha.

Manual hermano: [Activar un colaborador desde Hiring](activar-colaborador-desde-hiring.md).

### Evidencia visual / QA

Escenarios GVC canonizados:

```bash
TASK1363_CANDIDATE_TOKEN=<token> pnpm fe:capture task1363-assessment-taking-runtime --env=local --task=TASK-1363
TASK1363_REVIEW_APP_ID=<applicationId> pnpm fe:capture task1363-assessment-review-runtime --env=local --task=TASK-1363
```

Revisar al menos: instrucciones/consentimiento, timer, autosave, avance, scorecard barras/radar, cola y drawer. En mobile, confirmar que la cola y el drawer no queden como desktop comprimido.

## Gobernar una publicación

1. Abre `Publicación` y selecciona el opening.
2. Revisa el diff `Se publicará` vs `Solo interno`.
3. Edita solo contenido público permitido.
4. Confirma publicar, pausar o cerrar. La publicación refresca Careers; las notas internas nunca salen en el payload público.

## Problemas comunes

- **No ves Hiring Desk:** solicita la vista correspondiente; no se resuelve ampliando capabilities a ciegas.
- **403 al operar:** falta la capability fina para esa acción.
- **La tarjeta volvió:** el write de etapa falló y el rollback protegió el estado real.
- **No hay plantilla/scorecard:** es un vacío real del motor de assessment, no datos de demostración.
- **El candidato no puede enviar:** falta una respuesta guardada o el token no está `in_progress`; no fuerces submit desde SQL.
- **El token no abre:** pudo expirar, ya haberse usado o no estar disponible. La UI pública no revela el motivo exacto por seguridad.
- **El scorecard muestra pendientes:** hay respuestas abiertas sin corrección humana; no lo trates como final.
- **No puedes revelar un documento:** TASK-1362 sigue pendiente; no se debe bypassar el control.
- **No ves "Abrir Activation Lane":** la postulación debe estar decidida como `selected`, con destino `internal_hire`, y el handoff N10 debe existir/aprobarse. Si todavía no aparece en N11, espera la materialización reactiva o revisa el estado del handoff.

## Verificación operativa

Tras un rollout, probar Demand → Pipeline (drag y teclado) → Application 360 → Publication con un actor least-privilege; confirmar que no hay overflow a 390 px, que el anónimo recibe 401 y que `role_view_fallback` permanece en cero.
