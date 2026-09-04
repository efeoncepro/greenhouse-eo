# Color Berel · Medición, economía y experimentos

> **Versión:** 0.1 · **Fecha:** 2026-09-03 · **Estado:** diseño propuesto, sin instrumentar
> **Autoridad:** plan de trabajo de Efeonce; el contrato final se acuerda con Berel y el equipo de la app.
> Fuentes técnicas: [registro T1–T10](research/COLOR_BEREL_LANZAMIENTO_FUENTES_2026-09-03.md).

## 1. Arquitectura mínima y límites

1. **Tiendas:** ficha, adquisición y disponibilidad por plataforma/territorio; métricas nativas separadas.
2. **App:** SDK de analítica existente o propuesto, eventos de negocio y fallos; revisar el stack antes de añadir herramientas.
3. **Ads/atribución:** integración admitida por cada plataforma; evaluar MMP solo si hay necesidad de
   conciliación/deep linking que lo justifique. No contratar por defecto otro proveedor.
4. **Reporting:** un diccionario de métricas, cortes de OS/versión/cohorte, cobertura y conciliación.
   Export/warehouse si existe o si volumen y alcance lo justifican; no es requisito para empezar a diagnosticar.
5. **Salud técnica:** éxito/latencia de tareas, errores de registro/guardado y crashes por versión; herramienta actual por confirmar.

GTM web sirve a las superficies web; no sustituye SDK/eventos dentro de una app nativa. El contenedor y la
propiedad de Efeonce no son destinos para datos de Berel. No imponer automáticamente el prefijo interno
`gh_`: preservar el vocabulario existente del cliente; lo siguiente es una propuesta semántica a mapear.

En iOS, revisar ATT para los usos de tracking que lo requieren. AdAttributionKit permite medición agregada
sin exigir universalmente ese permiso; sus postbacks tienen límites de datos y tiempos [T7, T8]. No prometer
atribución individual completa ni reconstruirla con fingerprinting. Conservar `unknown` y coverage en reportes.

**Enlaces:** Universal Links/App Links y fallback a tienda/web según caso. La preservación del destino
después de instalar requiere validación específica. Firebase Dynamic Links está retirado según el calendario
oficial; no construir la campaña sobre él [T9, T10]. Auditar QR/enlaces heredados sin asumir que Berel los use.

## 2. Unidad de conteo e identidad

- Antes de login, una instancia de app/identificador seudónimo no equivale a una persona verificable.
- Después de login, usar el ID interno seudónimo autorizado para deduplicar cuando sea técnicamente viable;
  no usar correo, teléfono, nombre, ubicación precisa, foto o URL privada como parámetros de analítica.
- Reportar separadamente usuarios autenticados, dispositivos/instancias y agregados de plataforma. No
  unirlos como si hubiera identidad completa; medir cobertura y evitar cambios de definición entre semanas.
- `first_open` es primera apertura bajo la semántica del SDK, no descarga ni nuevo ser humano. Revisar
  reinstalaciones y adición de SDK a una base previa. `app_update` no es una instalación nueva [T6].
- Cohorte `existing` exige señal disponible de cuenta o historial previo; si no existe, `unknown`. No
  inferir que todo `first_open` posterior al lanzamiento representa adquisición neta.

## 3. Tracking plan propuesto

Los nombres automáticos/recomendados se usan solo con su significado documentado. Los nombres custom son
provisionales; contrastar implementación actual antes de renombrar o emitir. Una función descrita por la web
no prueba que el nuevo build emita un evento. Owner de implementación: equipo de desarrollo; especificación
y QA: Efeonce dentro del alcance que se acuerde.

| Momento | Evento candidato | Disparo válido | Campos mínimos / uso |
| --- | --- | --- | --- |
| Salida web hacia app | `app_destination_clicked` | Activación de enlace al destino resuelto | `source_surface`, `destination_type`, `campaign_id`; señal web, no instalación |
| Primera apertura | `first_open` | SDK, sin duplicación manual | OS/versión/fecha de cohorte y cobertura |
| Apertura después de actualizar | `app_update` | SDK conforme a su contrato | Versión anterior/nueva; adopción, no adquisición |
| Alta | `sign_up` | Cuenta creada con éxito | `method` permitido; no click del formulario |
| Inicio de tarea | `project_started` | Proyecto inicializado realmente | Tipo de tarea y origen; no contar vistas del botón |
| Visualización | `visualization_completed` | Resultado procesado y disponible | `input_mode`, `duration_ms`, `result_status`; sin imagen/URL de imagen |
| Valor percibible | `visualization_viewed` | Resultado visible al usuario | Mismo intento/proyecto seudónimo en la capa autorizada; no asumir que generarlo implica verlo |
| Guardado | `project_saved` | Persistencia confirmada | `has_color`, `has_visualization`, `is_first_qualified_save`; deduplicar reintentos |
| Cálculo | `paint_calculation_completed` | Resultado válido y mostrado | Familia de producto/estado; no reportarlo como compra |
| Recomendación | `product_recommendation_completed` | Cuestionario resuelto con resultado | Tipo de necesidad/producto permitido; no respuestas libres o PII |
| Compartir | `share` | Acción de compartir conforme al SDK | Método/contenido permitido; no afirmar recepción o lectura |
| Buscar tienda | `store_search_completed` | Resultado válido mostrado | Zona agregada si autorizada; no latitud/longitud exacta |
| Acción hacia tienda | `store_contact_initiated` | Llamada/ruta/contacto iniciado | `action_type`, `store_id`; intención, no visita física ni venta |
| Compra | `purchase` | Solo transacción real confirmada y reconciliable | ID de transacción, valor y moneda; fuera del MVP si no hay integración |
| Error de tarea | `project_operation_failed` | Fallo de operación identificado | `operation`, `reason_class`, versión; sin raw error ni datos del hogar |

Dimensiones comunes: OS, versión, build/canal, país agregado autorizado, usuario nuevo/previo/desconocido,
campaña/creativo cuando observables, experimento/variante y estado de consentimiento pertinente. Identificadores
de alta cardinalidad se conservan solo donde hagan falta para reconciliar; no registrar cada ID como dimensión GA4.

**A1 se deriva:** primera vez que el mismo usuario/instancia guarda un proyecto que incluye elección de color
y visualización completada y vista. No sumar `project_saved` + `sign_up` + A1 como tres conversiones de usuario.
Si no hay visualizador en el release, esta definición queda sin activar hasta acordar otra acción de valor.

## 4. Métricas con denominador

| Métrica | Definición propuesta | Cuidado |
| --- | --- | --- |
| Adquisición de tienda | Definición nativa por OS/fuente | No mezclar sin homologar visitas, impresiones y adquisiciones |
| Primeras aperturas | Instancias con `first_open` en el periodo | No equivalen a personas nuevas ni a descargas |
| Registro 7d | Instancias de cohorte nueva con alta en 7d / primeras aperturas de esa cohorte | Cohorte madura; deduplicación y login de cuentas previas separados |
| Activación 7d | Instancias/usuarios con A1 en 7d / primeras aperturas elegibles de cohorte nueva | Misma unidad en ambos términos y ventana completa |
| TTFV | Tiempo entre primera apertura y primera visualización vista | Mediana/p75 entre quienes llegan + tasa de no llegada |
| Retorno útil D7 | Usuarios activados que realizan acción de proyecto el día 7 desde A1 / activados elegibles | Día exacto, no confundir con retorno acumulado |
| Continuidad 2–7d | Activados que retoman acción útil entre días 2 y 7 desde A1 / activados con ventana completa | Métrica acumulada distinta de D7 |
| Avance a tienda 30d | Activados con acción hacia tienda en 30d / activados con ventana completa | Proxy de intención; no venta atribuida |
| Adopción de versión | Base conocida que abre la nueva versión / base elegible identificable | No usar `100 k+` descargas públicas como denominador |
| Costo atribuido por A1 | Gasto de una fuente / A1 atribuibles bajo su ventana y modelo | Cobertura limitada; por red/OS, sin sumar atribuciones duplicadas |
| Costo combinado por A1 | Gasto de medios total / A1 únicos observados del periodo/cohorte acordados | Indicador combinado con orgánico incluido; no causal ni CAC de comprador |

Una métrica no observada se muestra como «sin cobertura», nunca cero. Definir zona horaria, fecha de cohorte,
ventanas de atribución y maduración; congelar cortes para comparar periodos. Las ventas en distribuidores
requieren datos y método de conciliación o un experimento propio; un QR escaneado no cierra esa brecha.

## 5. Modelo económico sin inventar benchmarks

```text
I = B / CPI
F = I × tasa_primera_apertura
A = F × tasa_activacion_7d
S = A × tasa_accion_tienda_30d
costo_por_activado = B / A
```

`B` = medios, `I` = instalaciones del modelo, `F` = primeras aperturas, `A` = activados y `S` = intenciones
hacia tienda. Solo aplica a un embudo/cohorte consistente; no unir reportes incompatibles para llenar huecos.

| Escenario ilustrativo | B (MXN) | CPI supuesto (MXN) | Apertura | A1 sobre aperturas | I | A | Costo/A (MXN) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Base matemática | 100.000 | 20 | 80% | 25% | 5.000 | 1.000 | 100,00 |
| Mejor activación | 100.000 | 20 | 80% | 35% | 5.000 | 1.400 | 71,43 |
| Mayor costo de adquisición | 100.000 | 30 | 80% | 25% | 3.333,33 | 666,67 | 150,00 |

Son valores hipotéticos para sensibilidad, no una cotización, presupuesto recomendado o pronóstico. Las
fracciones son salidas esperadas del modelo, no personas observadas. No se deriva revenue/ROAS de ellas.
El tope admisible de costo por activado requiere estimar y validar la contribución económica posterior.

La guía Google [T4] ayuda a comprobar si un presupuesto puede sostener el objetivo elegido; no confundir
su recomendación de relación presupuesto/puja con una regla de rentabilidad. Si no alcanza la señal para
acciones internas, usar un objetivo anterior verificado temporalmente y vigilar calidad; no degradar el
reporte final a descargas únicamente.

## 6. Experimentos propuestos y qué permiten concluir

| Prueba | Hipótesis | Primaria | Guardrails | Método y límite |
| --- | --- | --- | --- | --- |
| Exploración de mensaje | Una tarea reconocible atrae personas con intención de usar | A1/costo por cohorte cuando atribuible | Registro, errores, calidad y cobertura | Variantes creativas iniciales; entrega algorítmica no es un A/B aleatorizado |
| Ficha de tienda | Ordenar capturas por tarea mejora adquisición de ficha | Métrica nativa de conversión elegible | Calidad/retención disponible y coherencia de promesa | Herramienta nativa por OS; comprobar elegibilidad y volumen, no extrapolar a revenue |
| Onboarding | Acercar la tarea útil y diferir lo opcional aumenta A1 | Activación 7d | Error, tiempo a valor, registro y continuidad | A/B por usuario/instancia estable si hay control técnico y muestra |
| Recuperación de proyecto | Ayuda contextual aumenta retorno útil | Continuidad 2–7d | Bajas de canal/quejas y fatiga | Holdout aleatorio entre elegibles con permiso; no comparar contactados con toda la base |

### Ejemplo de preregistro: onboarding

- Población: nuevos usuarios elegibles, un OS/build estable; excluir QA y migraciones identificadas.
- Unidad: usuario seudónimo estable cuando exista, de lo contrario instancia; asignación persistente 50/50.
- Primaria: A1 dentro de siete días desde la asignación, todos los asignados incluidos en denominador.
- Hipótesis ilustrativa: 25% base → 30%, MDE **5 puntos porcentuales** (20% relativo), bilateral α=0,05,
  potencia 80%, aproximación normal: alrededor de **1.252 por brazo**, 2.504 total. Recalcular con base real.
- Dos ciclos semanales como mínimo para reclutar y siete días adicionales para madurar la última cohorte.
  Si el volumen no permite un resultado útil en unas cuatro semanas, priorizar pruebas de tarea y QA.
- Antes de activar: fijar tolerancias de errores/crashes/registro y las exclusiones técnicas con Berel.
  Estos umbrales todavía no están aprobados: el experimento no está listo para ejecutarse.
- Decisión: comprobar asignación, integridad y muestra; valorar intervalo del efecto y relevancia económica.
  No declarar ganador porque un corte intermedio sale positivo; no llamar equivalentes a variantes sin potencia.

Las pruebas cualitativas iniciales pueden detectar incomprensión, permisos inoportunos o pérdida de proyecto;
no entregan un porcentaje de uplift. Cambiar antes/después con una campaña simultánea tampoco prueba causalidad.

## 7. Verificación previa y operación

**Antes de paid:** comprobar destino correcto por OS/versión, tarea central, rechazo de permisos, persistencia,
eventos sin duplicados, cobertura/consentimiento, ausencia de PII y disponibilidad del soporte. Probar captura
offline/reintento y fallos de visualización/guardado. Conservar evidencia de app → analítica → reporting, y
conversión recibida por ads cuando la integración esté disponible.

**Cadencia propuesta:** lectura diaria de errores, gasto y enlaces al inicio; revisión semanal de cohortes
maduras, creativos y decisiones; evaluación 30d de avance/continuidad. No escalar ante una mejora de CPI si
empeora A1, si aumenta la falla técnica o si la señal está incompleta. No corregir métricas mediante estimados
silenciosos para hacer coincidir plataformas.

No se publicaron tags, configuraron SDKs, modificaron cuentas ni ejecutaron pruebas o campañas. El siguiente
paso técnico es revisar el build y el stack real con el equipo de Berel, una vez acordado ese acceso.
