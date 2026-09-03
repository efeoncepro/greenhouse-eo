# TASK-1814 — Flujo de revisión y recuperación

Estado: propuesta 2026-09-03. Surface /hr/offboarding. Consumidor de TASK-1349; sin nuevo destino de navegación.

## Entry Points and Surfaces

Fila/acción Clasificar caso → inspector del caso → modo revisión del mismo inspector.
Deep link existente caseId selecciona exactamente un caso autorizado. Nuevo caso conserva estado separado.
No apilar inspector y drawer de creación; confirmar descarte si hay cambios.

## State and Transition Map

```text
Cola → cargar caso → resumen canónico
                     → Revisar/corregir → campos explícitos → preview de impacto
                       → Guardar → command pendiente → readback → resumen actualizado
                       → error/conflicto → conservar borrador / recargar versión
                     → blocked → revisar motivo → corrección autorizada → readback
                     → aprobado → próxima acción solo si requisitos backend completos
```

## Interaction and Recovery

No fechar al abrir ni aprobar. Required-field y errores del command se muestran inline.
Durante pending deshabilitar doble envío; fallo de recarga deja estado “sin verificar”, no éxito final.
Cambio de caseId limpia estado ajeno; versión obsoleta exige recarga, nunca sobrescribe silenciosamente.
Escape/click-away/cambio de selección dirty confirma descarte; foco vuelve a trigger o primer error.
Falta de permiso muestra lectura; unknown no habilita mutación por omisión.

## Contracts and Invariants

Decision, lane, fechas, requisitos y estado financiero proceden de TASK-1349; ninguna inferencia contractual
por honorarios o SCIM en cliente. No cancel/create bypass, no pagos ni SQL. Corrección material invalida aprobación.
El saldo cero de Felipe se verifica tras conciliación; no confundir generated/pending con deuda real.

## Responsive and Accessibility

Desktop conserva lista/contexto; 390px inspector a ancho disponible, campos apilados y acciones legibles.
Orden teclado coherente, foco al error, retorno al trigger y preferencia reduced-motion del sistema existente.
Sin scroll horizontal y sin drawer duplicado.

## GVC Verification

Fixtures sintéticos: SCIM sin fechas, honorarios, blocked, conflicto, solo acceso y solo lectura.
Recorrer error→corregir→guardar→recargar; modificar Nuevo caso y probar que otro caso no hereda fechas.
Desktop 1440px y móvil 390px; premium dossier, evidencia de foco/reduced-motion y scroll-width.
Readback UI/API/PG conjunta con TASK-1349 después del release; Felipe no se usa en pruebas automáticas.
