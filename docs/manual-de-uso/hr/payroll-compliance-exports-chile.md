# Exportar Previred y LRE desde Payroll

1. Abre el periodo de Payroll.
2. Verifica que el periodo este `Aprobado` o `Exportado`.
3. Revisa que las personas Chile dependiente tengan RUT verificado en Datos legales.
4. Usa `Previred` para descargar la planilla Previred.
5. Usa `LRE` para descargar el CSV del Libro de Remuneraciones Electronico.
6. Sube el archivo manualmente en el portal externo correspondiente.

Si la descarga falla, no se genera un archivo parcial. Corrige el RUT faltante, reabre/recalcula solo si Payroll realmente cambio y vuelve a descargar.

Permisos requeridos:

- `hr.payroll.export_previred` para Previred.
- `hr.payroll.export_lre` para LRE.

Cuidados:

- No editar montos manualmente en el archivo descargado salvo rectificacion controlada fuera de V1.
- No usar estos exports para honorarios o personas internacionales.
- El registro auditable queda en Greenhouse aunque el upload externo siga siendo manual.

