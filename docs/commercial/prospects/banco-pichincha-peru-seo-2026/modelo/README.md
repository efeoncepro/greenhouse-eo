# Modelo editable Pibank 2027

Preparación interna, 2026-10-06. Owner: Comercial / SEO-AEO; Finance del banco valida valoración.

`Pibank-caso-negocio-2027.xlsx` contiene un solo modelo mensual de seis meses y un selector para
Conservador/Base/Favorable. El caso activo recalcula captación, cohortes, saldo y sensibilidades.
`inputs.json` es la fuente reproducible de generación; `results.json` contiene los tres escenarios
evaluados para uso en la narrativa, con naturaleza y límites explícitos. `validation.json` registra
checks independientes de fórmulas y cambios de inputs en LibreOffice.

## Uso

1. Abrir el XLSX. Cambiar **Supuestos D4**: 1 Conservador, 2 Base, 3 Favorable.
2. Editar celdas amarillas/azules. Cada driver tiene fila activa y tres filas de casos, con los mismos meses.
3. Revisar Resumen, Mensual y Cohortes. Las sensibilidades de apertura/fondeo y retraso usan las visitas
   adicionales del caso seleccionado. Son cálculos simples con tasas constantes explícitas.
4. Mantener Finance D14 en `No` hasta validar el método neto. D15 es contribución neta **anual por USD
   de saldo externo**; incluye costos del fondeo según un único método del banco, sin sumar FTP/ahorros
   duplicados. D16 valida la inversión completa. ROI/payback siguen `N/D` hasta cumplir ambos gates,
   tener valor numérico y costos mensuales completos/positivos.
5. Cambios hechos en Excel no actualizan `inputs.json` ni `results.json`. Para un nuevo paquete reproducible,
   trasladar inputs al JSON y regenerar/validar. Las cifras del JSON son la captura del último build, no un
   vínculo live con un Excel editado.

## Naturaleza de los números

- Meta US$38 millones: **inferencia provisional del operador** a partir de 15.200 × US$2.500. No es dato
  confirmado por el banco; periodo, definición de cuenta y moneda requieren validación.
- USD es equivalencia aritmética de meta/ticket. El producto público vigente es Cuenta Soles; la planilla
  no afirma disponibilidad de cuenta USD ni fija tipo de cambio.
- Inicio enero 2027 es calendario de prueba editable. Seis meses corresponden al programa explorado;
  no se contabilizan doce meses de valor por defecto.
- Demanda proxy de **3.900 búsquedas/mes** se obtiene de estimaciones de mercado DataForSEO PE/es:
  MAX por seis grupos editoriales, snapshot septiembre2026 y monthly_searches hasta agosto2026.
  Alto rendimiento1.600 queda excluido del caso activo por SERP con resultados de países mixtos;
  su aceptación geográfica se puede explorar separadamente, sin volverlo elegible por fórmula.
  No es TAM de personas, baseline post-launch ni forecast2027. El factor de relevancia/elegibilidad75%
  es ilustrativo y recorta demanda usada a2.925; no elimina por prueba el solapamiento restante.
  MarcaPibank/competidores/soporte/educación/plazo fijo/USD futuro quedan fuera. Fuentes y grupo raw
  se conservan en Demanda/Fuentes; absent rows siguen NULL en dataset. Apertura, fondeo, captura,
  retención y origen externo son supuestos de prueba. Un dato ausente nunca equivale a cero.
- Inversión cliente y costo internoEfeonce se mantienen separados y pendientes. Capacidad995,9horas
  con reserva no se transforma en fee sin tarifas/costos. La matriz10k/25k/50k explora inversión total
  hipotética y valor por cuenta necesario; no es oferta ni aprobación de pricing. CAC/ROI/payback del
  escenario principal permanecen N/D mientras faltan sus inputs/validaciones.
- Saldo mantenido a 30/60/90 días incluye retiros en el promedio por cuenta original. Age zero representa
  depósito inicial en su mes; después se aplican proxies mensuales. Los hitos fuera del semestre quedan
  `Fuera 6m`. Stock al cierre no se suma como captación neta y saldo no se trata como revenue.
- Aperturas fraccionarias son expectativas matemáticas. No se infieren conversiones a partir de citas
  IA ni se cuentan SEO/IA/directo como poblaciones independientes.

## Regeneración y verificación

Usar el runtime bundled y los scripts de esta carpeta, sin instalar dependencias:

```bash
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 docs/commercial/prospects/banco-pichincha-peru-seo-2026/modelo/build_model.py
/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 docs/commercial/prospects/banco-pichincha-peru-seo-2026/modelo/validate_model.py
```

`demand-source.json` conserva metadata/grupos y SHA256 del dataset original, suficiente para regenerar
las entradas del workbook sin depender de su listado completo de keywords. El repo conserva el dataset
completo y respuestas provider. El generador aborta si cambia el proxy sin actualizar inputs/narrativa.

El generador recalcula XLSX con LibreOffice bundled y conserva fórmulas editables/valores cacheados.
La validación lee esos valores independientemente, comprueba dos trayectorias, cohortes, escenarios,
sensibilidades y gates financieros, y cambia selector/driver del último mes en copias temporales.
Se prueban inversión vacía y cero, relevancia vacía/cero, captura seleccionada vacía y caso no seleccionado
vacío. Falta de input activo se propaga `N/D`; cero explícito calcula cero. Interacción en Excel Desktop no
está certificada. QA visual de las siete hojas se realiza mediante exportación PDF en LibreOffice.

La copia de entrega vive en `/Users/jreye/Documents/Banco Pichincha Peru — Prospect Case/02-Uso-interno/modelo/`.
No constituye envío al prospecto, publicación ni oferta aprobada.
