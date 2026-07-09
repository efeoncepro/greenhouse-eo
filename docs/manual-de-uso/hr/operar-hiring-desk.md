# Operar Hiring Desk

## Antes de empezar

Necesitas una vista `gestion.hiring*` asignada y las capabilities correspondientes a la acción. El acceso a la pantalla no sustituye el permiso de leer, escribir, publicar, evaluar o decidir.

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
2. En `Evaluación`, asigna un test si hay plantilla activa. El token se muestra una sola vez. En una evaluación respondida, abre `Revisar evaluación`, edita/confirma cada score humano o sugerencia IA y finaliza el scorecard cuando no queden respuestas pendientes.
3. En `Documentos`, usa enlaces públicos permitidos. No intentes revelar identidad hasta que TASK-1362 entregue resolver, capability, motivo y auditoría; el botón deshabilitado es intencional.
4. En `Decisión`, elige avanzar, rechazar o esperar; completa destino cuando aplique, razón y evidencia. Revisa el diálogo antes de confirmar.
5. Usa `Actividad` e `Historial de decisiones` para verificar la trazabilidad append-only.

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
- **No puedes revelar un documento:** TASK-1362 sigue pendiente; no se debe bypassar el control.

## Verificación operativa

Tras un rollout, probar Demand → Pipeline (drag y teclado) → Application 360 → Publication con un actor least-privilege; confirmar que no hay overflow a 390 px, que el anónimo recibe 401 y que `role_view_fallback` permanece en cero.
