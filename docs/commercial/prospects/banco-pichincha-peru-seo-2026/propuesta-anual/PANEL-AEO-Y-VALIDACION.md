# Pibank 2027 · Panel AEO reproducible y validación

**Diseño candidato, corte 06-10-2026.** Ninguno de los motores se ha llamado para este panel. Baseline: **ND/no ejecutada** para todas las celdas; no hay claim de cita, recomendación o exactitud IA observado. La demo X-Ray es editorial y no acredita resultados del panel. SERP/keywords del research son evidencia separada, no sustituyen una corrida IA.

AEO comparte páginas/fuentes/identidad/links con SEO, pero observar respuestas requiere método propio. El panel vigila presencia, fuentes, exactitud y diferencias entre plataformas. Su unidad es **observación fechada de consulta × motor × modo × réplica**, no «visibilidad IA» universal. Una cita no equivale a visita, recomendación, apertura ni fondeo.

## 1. Preguntas y propósito

Set fijo inicial 24 preguntas, Perú/es-PE, producto Soles. Son preguntas de decisión seleccionadas como hipótesis; no se asigna volumen a todas ni se deduce TAM. Revisar el set con corpus, investigación ampliada, conversaciones del banco y GSC. Mantener un set longitudinal y versionar cambios; agregar consulta nueva no reescribe la baseline.

| ID | Prompt exacto candidato | Cluster / uso | Tipo |
| --- | --- | --- | --- |
| Q01 | ¿Cómo comparo cuentas de ahorro en soles en Perú si quiero intereses y disponer de mi dinero? | Comparación por tarea, no tasa máxima | No marca |
| Q02 | ¿Qué debo revisar antes de elegir la mejor cuenta de ahorro en soles en Perú? | Criterios de rendimiento/costo/seguridad | No marca |
| Q03 | ¿Qué diferencia hay entre una cuenta de ahorro para ganar intereses y una cuenta para pagos diarios en Perú? | Digital condicionado a producto | No marca |
| Q04 | ¿Cómo comparo TEA y TREA de cuentas de ahorro en Perú sin equivocarme? | Costo/condiciones | No marca |
| Q05 | ¿Qué significa saldo promedio mensual al calcular intereses de una cuenta de ahorro en Perú? | Educación/cálculo | No marca |
| Q06 | ¿Cuándo se pagan los intereses de una cuenta de ahorro en soles y qué condiciones debo revisar en Perú? | Abono/condiciones | No marca |
| Q07 | ¿Qué comisiones e impuestos debo revisar al mover mis ahorros entre bancos en Perú? | Costos operativos | No marca |
| Q08 | ¿Cómo puedo ahorrar y mover mi dinero si mi cuenta de ahorro no tiene tarjeta en Perú? | Uso producto sin tarjeta | No marca |
| Q09 | ¿Qué necesito para abrir una cuenta de ahorro digital en Perú? | Elegibilidad/apertura | No marca |
| Q10 | ¿Puedo abrir una cuenta de ahorro digital en Perú sin ir a una oficina? | Apertura digital | No marca |
| Q11 | ¿Cómo hago el primer depósito en una cuenta de ahorro digital en Perú? | Fondeo, asistido | No marca |
| Q12 | ¿Qué diferencia hay entre transferencias inmediatas y por horarios en Perú? | Operación/liquidez | No marca |
| Q13 | ¿Qué debo revisar sobre horarios y límites antes de transferir mis ahorros en Perú? | Operación/condiciones | No marca |
| Q14 | ¿Cómo verifico si una cuenta de ahorro digital y el banco que la ofrece son confiables en Perú? | Entidad/confianza | No marca |
| Q15 | ¿Qué cubre y qué no cubre el Fondo de Seguro de Depósitos en Perú? | Seguridad/condiciones | No marca |
| Q16 | ¿Cómo reconozco la app oficial de un banco y evito phishing antes de mover mis ahorros en Perú? | App/seguridad | No marca |
| Q17 | ¿Qué es Pibank Perú y qué relación tiene con Banco Pichincha Perú? | Identidad, país correcto | Marca |
| Q18 | ¿Para qué sirve la Cuenta Soles Pibank y qué operaciones no permite? | Producto/fit | Marca |
| Q19 | ¿Cuál es la tasa vigente de la Cuenta Soles Pibank y en qué condiciones aplica? | Sensible, fecha obligatoria | Marca |
| Q20 | ¿La Cuenta Soles Pibank cobra comisiones o tiene servicios con costo? | Condiciones/excepciones | Marca |
| Q21 | ¿Qué requisitos y documentos necesito para abrir una cuenta Pibank Perú? | Apertura | Marca |
| Q22 | ¿Cómo hago mi primer fondeo y transfiero desde mi Cuenta Soles Pibank? | Fondeo/operación | Marca |
| Q23 | ¿Cómo contacto con Pibank Perú si necesito ayuda con mi cuenta o la app? | Canal oficial | Marca |
| Q24 | ¿En qué se diferencia la Cuenta Soles Pibank de una cuenta transaccional con tarjeta en Perú? | Comparador por JTBD | Marca/comparación |

No se usan prompts como «recomienda Pibank» ni se obliga a citar un dominio: sesgarían presencia. El texto exacto incluye país para reducir mezcla Pibank España/EE.UU./otros Pichincha. Saldo, moneda, persona y plazo se especifican cuando se haga una variante de comparación; son set version distinto. No se consulta USD como producto disponible si no hay fuente/plan aprobado. Educación y confianza son asistencia a decisión, no volúmenes de adquisición sumables a demanda financiera directa.

## 2. Superficies, modos y matriz de corrida

| ID | Superficie/mode propuesto | Unidad observable | Estado basal |
| --- | --- | --- | --- |
| G-SERP | Google Search Perú, es-PE, desktop acordado | SERP orgánico y, si aparece, AI Overview en el mismo snapshot; registrar ambos por separado | ND/no ejecutado |
| C-SEARCH | ChatGPT con búsqueda web activada, modelo/plan visible registrado | Respuesta directa, menciones, enlaces/citas y destinos | ND/no ejecutado; cuenta/modo por verificar |
| G-GROUND | Gemini con grounding/búsqueda web cuando el modo lo exponga | Respuesta/citas y verificación de fuente; no equiparar respuesta sin web | ND/no ejecutado; acceso/mode por verificar |
| B-WEB | Copilot modo web/búsqueda que exponga fuentes | Respuesta/mención/cita/enlaces, configuración registrada | ND/no ejecutado; acceso/mode por verificar |
| G-AIMODE | Google AI Mode: piloto trimestral seis consultas centinela Q01/Q02/Q08/Q14/Q19/Q24 | Conversación/respuesta/fuentes; distinto de AIO/SERP | ND/no ejecutado; disponibilidad Perú/cuenta por verificar |

Core mensual:24 consultas × 4 superficies × 2 réplicas = **192 observaciones de ejecución**. En G-SERP, rank orgánico y AIO son mediciones distintas de un mismo snapshot: no contar una observación dos veces como audiencia. AI Overview ausente en una SERP válida se registra «no activado» con evidencia, no error ni cita 0 genérica para todos los motores. AI Mode trimestral:6 consultas × 2 réplicas = 12 observaciones adicionales. Si el modo no está disponible en Perú/cuenta, marcar no disponible y no sustituir silenciosamente por API o país.

Hacer dos réplicas en ventanas distintas dentro del mismo corte mensual, idealmente separadas 48–72 h como diseño operativo, sin almacenar o simular espera automática. Usar sesión nueva por pregunta, sin historial ni custominstructions del cliente; registrar login, plan/modelo, idioma, mercado, device, webmode, timestamp UTC y Perú, collector y herramienta. La ubicación se registra como explicitprompt/setting/provider, nunca se presume geolocalización exacta porIP. Elegir el mismo método UI o API por cada serie; API/provider y appconsumer no son experiencias equivalentes. Si cambian mode/model/provider, abrir serie nueva y anotar discontinuidad.

Preflight de proveedor documentado en `../research/pibank-expanded-2026-10-06/aeo-mentions-coverage.json`: PE/es figura disponible para Google en su corpus de menciones; ChatGPT Mentions no figura disponible para PE/es. Ese corpus no mide Pibank ni demanda, y el inventario de modelos API no prueba acceso a la interfaz consumer. Para C-SEARCH/G-GROUND/B-WEB validar UI/cuenta autorizada o método distinto con serie identificada; no usar la disponibilidad Google para declarar los cuatro motores operativos.

Cuentas/permisos/licencias/costos se validan antes de ejecutar. No evadir límites/captcha ni compartir credenciales, no scraping activo contra términos, no automatizar acciones de pago sin presupuesto. Si UI manual tarda más que supuesto de capacidad, priorizar el set estable y redimensionar con Operations. No declarar capacidades del motor hoy a partir de etiquetas de marketing: la primera corrida debe capturar qué modo realmente se usó.

## 3. Dataset y evidencia por observación

Guardar una fila por celda con los siguientes campos, dentro de almacenamiento aprobado sin credenciales:

```text
run_id, panel_version, query_id, prompt_exact, cluster, branded_flag,
market_requested, location_method, locale, device, surface, mode,
model_visible, provider, plan, account_state, timestamp_utc, replica,
status [valid|no_trigger|unavailable|error|not_run], reason,
answer_capture_ref, screenshot_ref, answer_summary,
brand_mentioned, brand_recommended_context, direct_answer_present,
cited_urls[], citation_domains[], pibank_cited, official_bank_cited,
claim_checks[], material_error, source_asof, comparison_set_version,
reviewer, review_date, method_changes
```

Capturar respuesta/fuentes en forma reproducible dentro de licencia/retención aprobada; cuando sólo se conserve excerpt, guardar selección y screenshot, no afirmar archivo completo. Normalizar dominios y guardar URL original/canonical/fecha: `pibank.pe` y `pichincha.pe` son entidades/superficies relacionadas pero métricas separadas. Un dominio citado por motor no demuestra fuente leída, propiedad de recomendación o posición preferida. Mención de «Banco Pichincha» de otro país se codifica mezcla de entidad.

Review: un analista clasifica; un segundo reviewer revisa todas las condiciones monetarias/seguridad/entidad y una muestra candidata 20% del resto, más discrepancias entre réplicas. Producto/Legal decide exactitud financiera, no un score del agente. Guardar desacuerdo y resolución; no borrar error material porque la respuesta también tenga enlace oficial.

## 4. Métricas por motor, modo, cluster y réplica

| Métrica | Fórmula/denominador | Qué permite concluir |
| --- | --- | --- |
| Activación AIO | SERP con AIO÷SERP válidas G-SERP | Frecuencia del fenómeno en este set; no cuota de mercado |
| Presencia de marca | Observaciones válidas con Pibank Perú correcto÷válidas del mismo motor/mode/set | Presencia en preguntas seleccionadas; separar marca/no marca |
| Cobertura citada propia | Observaciones con URLpibank.pe citada÷válidas con fuentes disponibles del mismo motor/mode | Citas en muestra; URLs/preguntas y fuente fecha; no aperturas |
| Cobertura de respuestas | Preguntas con respuesta directa completa÷preguntas válidas por motor/mode | Resolución de intención, independiente de la marca citada |
| Exactitud de claim | Claims evaluables correctos÷claims evaluables, con n y errores materiales | Precisión respecto fuente/version; NA cuando no hay fuente/claim |
| Frescura | Claims financieros con fuente vigente al run÷claims financieros evaluables | Drift temporal; no promete que motor actualice rápido |
| Share comparativo | Observaciones que citan cada marca÷observaciones comparativas válidas del mismo motor/mode | Share de presencia por marca, múltiples marcas pueden sumar>100%; no exclusividad ni mercado |
| Consistencia | Preguntas con resultado equivalente entre dos réplicas÷preguntas válidas en ambas | Variabilidad de esta muestra, no confiabilidad estadística universal |

**No score agregado entre motores**, no ponderaciones inventadas que igualen algoritmos/modos, no suma de cuotas, no total «conversiones IA». Mostrar counts/denominadores y series por motor/cluster. Una observación no ejecutada/error no se transforma en ausencia de cita. Para AIO, separar denominadorSERP válidas de AIO activados: presencia en SERP y presencia entre AIO responden preguntas distintas.

Validar claims sensibles: Pibank Perú/banco legal; moneda; producto/cuenta; TEA/TREA con saldo/vigencia; tasa/costo/excepción; disponibilidad de fondos/canales; requisito; FSD y límites; contacto app oficial. Tipos de error: incorrecto, desactualizado, omisiónmaterial, mezclaentidad, unsupported, insuficientemente fechado. Error de tasa o cobertura requiere escalación; no publicar contenido correctivo con cifra no aprobada sólo para «ganar» un prompt.

## 5. Comparadores y casos de saldo

Competidores oficiales identificados por research: [Efectibank ahorro](https://www.efectibank.pe/ahorros/cuenta-de-ahorros/), [Interbank Súper Tasa](https://interbank.pe/cuentas/cuentas-ahorro/cuenta-super-tasa), [Scotia Cuenta Power](https://www.scotiabank.com.pe/Personas/Ahorros/Cuentas-Bancarias/cuenta-power), [BBVA Digital](https://www.bbva.pe/personas/productos/cuentas/ahorro/cuenta-digital.html), [BCP apertura multiproducto](https://www.viabcp.com/abrir-cuenta). No todos resuelven el mismoJTBD. El [research](../research/PIBANK-DEMAND-2026-10-06.md) conserva lectura fechada de ofertas. Esa lectura no prueba conveniencia para una persona ni tasas futuras.

Antes de emitir tabla o validar respuesta: producto exacto, moneda Soles, saldo de escenario, condiciones de elegibilidad, tramo/costo, liquidez, tarjeta/pagos, impuestos y fecha/fuente. Saldo escenario candidato S/1.000/S/10.000/S/50.000 sólo si tarifa de cada producto permite calcular; no son ticket promedio confirmado del banco. Producto de hasta una tasa máxima no se compara con tasa plana usando su máximo para todo saldo. Cuenta de pagos sin rendimiento puede ser complemento, no sustituto. BCPmultiproducto requiere elegir cuenta, no «BCP pagaX».

El banco aprueba el marco comparativo y uso de marcas/fuentes. No hay tabla de «mejor banco» publicada en este plan. Documentar fuentes primarias y fecha; si cambian condiciones repetir verificación antes de comparar. No reutilizar capturas viejas como condición vigente.

## 6. Search Console, tráfico real y límites de atribución

Confirmar acceso a GSC propiedad Pibank; país/dispositivo/fecha/página y brand/nonbrand. Google documenta un [informe de rendimiento IA generativa](https://support.google.com/webmasters/answer/16984139?hl=es) con impresiones y export; verificar disponibilidad real. La dimensión página se agrega distinto de propiedad; los caracteres no disponibles exportados como cero necesitan conservar máscaraND desde la UI. No asumir API, consultas, clics o conversiones que el informe no declara.

Ese informe incluye datos del tipo Web de Rendimiento: **no sumar sus impresiones a Web**, ni sumar páginas para replicar gráfico de propiedad. [AI features de Google](https://developers.google.com/search/docs/appearance/ai-features) conserva la inclusión de tráfico en Web. El panel de prompts y GSC tienen denominadores distintos; documentar comparables y ventanas. Referidos de motores en analytics, si consent y captura permiten, son tráfico observado; dark/direct no se adjudica entero a IA.

Apertura/fondeo/saldo se obtienen sólo de analítica/onboarding/data banco con definición/cohort/moneda y permisos. La cita IA no se convierte en porcentaje de fondeo. Una fuente visible tampoco demuestra causalidad: comparar cambios y experimentos controlables según volumen; Finance utiliza método/horizonte únicos. Resultado pendiente de acceso se presentaND, sin inventar una conversión 0.

## 7. Rutina anual y criterios de entrega

M1: validar licencias/modes/settings, versión del panel, primera corrida y fuentes bancarias; si falta acceso entregar método/registroND y fecha de siguiente intento. M2–M12: ejecutar set estable, review, mapa de errores, recomendaciones de página y reporte por motor. TrimestralmenteM 3/M6/M9/M12: comparables, piloto AI Mode, prompts/huecos y madurez SEO/cohort; mantener series históricas aunque se recalibre set.

Aceptación controlable: archivo por celda o status justificable; queries/settings/fecha/metodología; fuentes y exactitud revisadas; agregación con denominadores correctos; recomendaciones enlazadas a backlog y owner. No exige un nivel de citas garantizado. Si un motor falla, el trabajo no se falsifica como datos completados; reportar cobertura de ejecución y reintento dentro de capacidad. Acceso/consumo adicional se dimensiona con Operations/Finance antes de prometer frecuencia.
