# Evaluaciones ejecutadas · 4 de septiembre de 2026

- Caso conocido: 5/5 criterios editoriales, revisión por agente que no escribió los módulos de evidencia y visualización. Participó en producción PDF; independencia parcial explícita.
- Transferencia a cifras y exclusiones nuevas: 6/6 criterios; cálculo y salida cliente en `2026-09-04-transfer-case.md`. No es prueba con usuarios externos ni certificación de diseño.
- Se corrigieron dos ambigüedades: revisión visual exige cada página a tamaño de lectura, y una tasa puede compararse relativamente si se etiqueta con sus bases. El fixture conocido ahora identifica tareas cerradas; su ejecución anterior conserva el texto de entrada original en el registro.
- Helper: `python scripts/test_pdf_preflight.py` crea un PDF válido y detecta seis defectos deliberados (omisión, multiplicidad, orden, metadata, tamaño y enlace requerido). Ejecutado con PyMuPDF.
- Aplicación real: informe Berel de 55 páginas; preflight, fuentes embebidas, metadata, tamaño, enlaces y 648 campos consumidos en orden. Evidencia en `docs/audits/seo/berel-agosto-2026/`.

Los otros escenarios de `cases.json` permanecen como casos para evaluación; no se presentan como ejecutados.
