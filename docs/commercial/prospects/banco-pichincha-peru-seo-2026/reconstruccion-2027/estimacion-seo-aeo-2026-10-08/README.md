# Estimación SEO/AEO — 08-10-2026

**Estado:** estimación de planificación terminada con supuestos autorizados por Julio. No medición del banco, garantía comercial ni presupuesto de medios. El PDF lo actualiza Claude.

Leer [estimación e instrucciones para Claude](ESTIMACION-Y-AJUSTES-PARA-CLAUDE.md). Su copia de entrega está en OneDrive, carpeta Licitaciones/Banco Pichincha, como `Pibank-Estimacion-SEO-AEO-y-ajustes-para-Claude-2026-10-08.md`.

- Central: 33.670 visitas orgánicas y 230 referencias PR; 759 aperturas; 504 cuentas fondeadas dentro del año; 22 fondeos pasan a enero.
- Mejora central: 154 cuentas adicionales por 100.000 visitas elegibles de otros canales, comparando el mismo tráfico.
- Meta completa: requiere 1.026.286 visitas elegibles de otros canales. A ese nivel, la contribución potencial del programa es de 2.081 cuentas. El tráfico requerido no es un forecast de adquisición bancaria.
- Precios preservados: base US$4.500/mes; gradual US$79.200/año; integral US$89.200/año.

## Reproducción y archivos

Desde esta carpeta: `python3 calcular.py` (biblioteca estándar; sin red ni gasto). Lee investigación existente y escribe exclusivamente resultados en esta carpeta. No importa el modelo de medios descartado.

- [calcular.py](calcular.py): fórmulas, selección de 63 consultas, curvas y validaciones.
- [resultados.json](resultados.json): tres escenarios, sensibilidades, audiencia y hashes de entradas.
- [panel.csv](panel.csv): consulta, mes disponible, volumen, serie 2026 y fuente cruda.
- [central-mensual.csv](central-mensual.csv): contribución directa por cohorte/mes.
- [puente-meta-mensual.csv](puente-meta-mensual.csv): requisito central para alcanzar 15.200; no tráfico observado.
- [preservacion.json](preservacion.json): hashes de los PDF/Excel preservados durante la actualización.

La validación comprueba valores contra las respuestas del proveedor, selección única, suma de volúmenes, igualdad de resultados por cohorte/calendario, ausencia de doble conteo algebraico, resolución de la meta y conservación de entradas. No certifica los supuestos comerciales. La sensibilidad mantiene los cálculos anteriores intactos.
