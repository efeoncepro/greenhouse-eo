# Medición del Blog: capacidad propuesta

La propuesta permite encargar un informe de Blog para un Servicio/Space de una organización sin mezclarlo
con otra cuenta operativa. Para SKY, el contenido se limita al host `blog.skyairline.com` y reglas de rutas
versionadas. No hay alta de una nueva cuenta real ni activación de este comportamiento en producción.

El informe requiere tres fuentes independientes del período: GA4, Search Console y corrida del motor AEO.
Debe explicar población medida, calidad, disponibilidad y comparación. Un dato ausente no se presenta como
cero; tráfico referido por IA no acredita presencia o citas del Blog en respuestas del motor.

Si falta evidencia, el contrato conserva el resultado como preview con motivos. Pasar la validación candidata
no concede permisos, aprueba editorialmente ni envía el documento. El historial anterior de Diseño conserva
su identidad; medir tráfico antiguo del Blog no atribuye ese resultado al nuevo servicio de Efeonce.

Especificación: [contrato técnico](../../architecture/EFEONCE_INSIGHTS_BLOG_MEASUREMENT_CONTRACT_V1.md).
Estado y límites: [evaluación local](../../audits/client-portal/2026-11-01-sky-real-component-validation/README.md).
Reproducción: [manual](../../manual-de-uso/insights/validar-blog-y-bridge-localmente.md).

Acceso departamental también propuesto: una persona puede operar Diseño, SEO o ambos mediante contexto y
permiso explícito por Space/Service. [Prueba local](../../audits/client-portal/2026-11-01-sky-space-context-validation/README.md)
con revocación y renovación confirma ese comportamiento candidato en A′ y B. El listado actual de Insights
sigue siendo por Organization; la separación todavía no está activa para clientes reales.

La [comparación financiera y operativa](../../audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md)
recomienda conservar un único cliente comercial SKY y separar Diseño/SEO mediante Spaces (opción B).
Así, ingresos y costos conservan su dueño comercial y se atribuyen a cada servicio con reglas explícitas.
Falta implementar contexto, routing estable y protección histórica antes de activar esa separación.
