# Servicio SEO del Blog SKY

Estado: marco operativo interno aprobado para preparación por Julio el 15-10-2026. El anexo contractual,
las cantidades finales y las metas numéricas siguen sujetos a su fuente firmada y a la auditoría. Inicio
acordado en reunión: 01-11-2026; kickoff operativo: 02-11-2026 a las 10:00, Chile. No se verificó el calendario.

Estado al 23-10-2026: auditoría consolidada entregable e informe A4 para SKY generado y revisado; correos
redactados; **nada enviado a SKY**. El expediente del encargo vive en [`caso-auditoria-2026-10/`](caso-auditoria-2026-10/README.md)
y sus cifras salen sólo de [HECHOS.md](caso-auditoria-2026-10/HECHOS.md).

## Resultado y alcance

La [matriz de cobertura y pendientes](COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md) distingue el
diagnóstico base entregado de la auditoría integral todavía parcial: migración, indexación/seguridad,
calidad editorial, competencia/SERP, enlaces externos, experiencia móvil y medición comercial.
El 23-10 los frentes 01 a 06 avanzaron sin cerrarse. El primer lote está preparado y reordenado;
implementación y resultados siguen pendientes. El alcance auditado es el blog y su prefijo histórico;
todo el SEO de SKY y reservas requieren una delimitación adicional.

Operar la recuperación y el crecimiento orgánico de `blog.skyairline.com` con diagnóstico técnico,
priorización editorial, optimización del contenido existente y medición trazable. El servicio busca que
SKY sea descubierto para consultas de viaje relacionadas con sus rutas y que ese descubrimiento produzca
visitas relevantes y acciones observables hacia la oferta de vuelos.

La reunión del 15 de octubre registra una caída histórica declarada por el cliente de aproximadamente
80.000 a 40.000 visitas después de una migración motivada por problemas de seguridad, alrededor de agosto
de 2025. La [auditoría del 15-10](../../audits/growth/2026-10-15-sky-organic-channel-audit.md) observó la
transición del prefijo `www.skyairline.com/blog/` al subdominio el 26–27 de septiembre de 2025. La
[auditoría consolidada del 23-10](../../audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md) corrige
la lectura: GA4 confirma el «80k→40k» de Pilar (sep-25 75.506 → oct-25 42.585 sesiones Organic Search),
y el registro técnico de despliegue sigue pendiente.

Pilar espera una recuperación importante durante los tres primeros meses. Julio comprometió una auditoría
para el martes 20 de octubre o antes y preparar el indicador de equivalencia publicitaria. No comprometió
un plazo ni una cifra de recuperación. Noviembre–enero es una ventana de trabajo y revisión, no una garantía.

| Frente | Entregable y aceptación |
| --- | --- |
| Auditoría inicial | Inventario, evidencia de la migración, problemas comprobados, hipótesis por validar y backlog priorizado con responsables/dependencias. |
| Recuperación técnica | Recomendaciones y validación de redirecciones, indexabilidad, canonicals, robots, sitemaps, enlaces y páginas perdidas. Cada cambio necesita owner técnico y comprobación posterior. |
| Planeación editorial | Propuesta de títulos, intención, breve sinopsis, ruta/mercado y acción nueva/refresh/consolidación. SKY aprueba antes de producir. |
| Contenido | Brief y optimización de artículos aprobados, conforme al playbook editorial vivo. Publicación progresiva y comprobación de URL final. |
| Medición | GA4 y GSC por blog, país y página; consultas de marca/sin marca; prioridades y evolución mensual. Valor publicitario estimado con cobertura explícita. |
| Continuidad | Registro de decisiones, seguimiento de acciones y reporte que conecte problemas, ejecución y resultados observados. |

Las cantidades mensuales, extensión de artículos, newsletter, producción visual y cualquier trabajo fuera
del blog se confirman en el anexo y su calendario aprobado. Las propuestas comerciales son antecedentes;
este documento no convierte sus cantidades o precios en condiciones firmadas. No incluye compra de medios,
reconstrucción de infraestructura, migración nueva o intervención del motor de reservas por inferencia.

## Diagnóstico vigente (23-10-2026)

- **Sin evidencia de penalización.** Las URL antiguas redirigen 1:1 con 301 (muestra de 110: 93,6 % mismo
  slug, 3,6 % equivalente, 2,7 % a 404; cero 302 y cero a la home). Falta revisar acciones manuales y
  seguridad en la interfaz GSC.
- **Tres etapas, no una:** deterioro previo (mar–sep 2025, coincide con AI Overviews y publicación masiva),
  migración (26–27/09/2025) y caída posterior (quiebre de posición hacia el 20-04-2026 y escalón desde el
  15-10-2026 en búsquedas de marca de equipaje). Octubre 2026 va −35,6 % interanual: no está estabilizado.
- **Causa técnica nombrada:** el plugin SEO (All in One SEO) no se migró; 0 de 1.700 artículos con meta
  description, JSON-LD o autor. Se suman la copia indexable en Azure, la falta de sitemap/robots, el 37 %
  de posts alcanzables por enlaces y las hipótesis de subdominio vs. subcarpeta, AI Overviews y volumen.
- **Alerta Perú:** nueve artículos de Perú vivos el 15-10 respondían 404 el 23-10, mientras aparecían 12
  posts nuevos. Alguien con acceso al WordPress retira y publica; el detalle está en HECHOS.
- **Escenarios nov-26 a ene-27:** sin intervenir, base y estructural, como estimación de Efeonce y no
  compromiso. El valor publicitario se presenta como rango (US$ 6–16 mil/mes hoy; 28–45 mil antes de migrar).

El informe A4 (23 páginas) se regenera con `pnpm exec tsx scripts/seo/sky-blog-audit-report.ts` y
`pnpm report:compose`, usando el logo oficial negativo de SKY; el detalle está en el [caso](caso-auditoria-2026-10/README.md).

## Fuentes de verdad

| Fuente | Qué gobierna |
| --- | --- |
| Anexo firmado + cambios aprobados | Alcance comercial, cantidades, precio, condiciones y responsabilidades contractuales. Pendiente de incorporar. |
| [Reunión con Natalia y Pilar, 15-10](https://app.notion.com/p/3fa39c2fefe78144b63bead05c21d173) | Expectativas y compromisos, contrastados con la transcripción. |
| [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e) | Producción de artículos y handoff; enlaza las normas de voz, imagen y rutas vigentes. |
| Notion del cliente / Content Hub | Inventario editorial, responsables, aprobaciones, calendario y estado operativo. |
| WordPress | Contenido y configuración efectiva; publicar se confirma abriendo la URL final. |
| GA4 / GSC conectados a SKY | Desempeño propio. Cada fuente conserva su métrica y calendario. |
| DataForSEO | CPC y visibilidad estimados, con mercado, fecha y metodología. |

La [Propuesta Flujo de trabajo + SKILL](https://app.notion.com/p/3ed39c2fefe780e4aaddde27f828e3a3)
es antecedente de producción visual. Para instrucciones de imágenes se siguen las referencias vigentes del
playbook, que ha evolucionado después de esa propuesta. No copiar aquí dimensiones o reglas de voz.

## Responsables y dependencias

- **Julio / liderazgo SEO Efeonce:** auditoría, prioridades, metodología, decisiones técnicas y rendición de resultados.
- **Natalia / SKY:** prioridades editoriales y de rutas, revisión de títulos/sinopsis y coordinación del contenido.
- **Pilar / SKY:** expectativas, evaluación del servicio y último reporte del proveedor anterior.
- **Leandro / SKY:** habilitación técnica de WordPress y coordinación de implementación. Acceso efectivo pendiente de comprobar.
- **Nachira / SKY:** gestión del anexo, según la reunión. Firma pendiente de evidencia.
- **Equipo editorial/diseño:** ejecución conforme al playbook y a los responsables actuales de cada tarea en Notion.

No borrar cuentas del proveedor anterior ni reasignar autoría durante una lectura. Cualquier transición de
usuarios conserva contenido, autoría y acceso de recuperación. El dueño técnico valida la operación concreta.

## Plan inicial

El [primer lote de recuperación preparado el 15-10](PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md) concreta
veinte URLs priorizadas, diez del primer lote, con fichas, metadatos propuestos, manifiestos técnicos y
seguimiento. Es preparación revisable: la implementación y sus resultados conservan su estado propio.
Desde el 23-10 el lote se reordena: primero las palancas de todo el sitio y lo estacional antes del 15-11;
ver el Delta del plan y el backlog editorial de 30 piezas en `outputs/sky-blog-seo-audit-2026-10-23/`.

| Momento | Trabajo y criterio de salida |
| --- | --- |
| Hasta 20-10 | Auditoría inicial con datos disponibles y dependencias visibles. Si falta WordPress o historia, entregar hallazgos comprobados y declarar el diagnóstico parcial. |
| Antes del kickoff | Confirmar anexo, accesos, reporte anterior, dominios/fecha de migración y prioridades comerciales de rutas. Establecer baseline comparable. |
| Noviembre | Corregir primero bloqueos comprobados de rastreo/indexación y páginas perdidas con demanda. Lanzar lotes editoriales aprobados y refresh de artículos con potencial. |
| Diciembre | Revisar respuesta de las correcciones, ampliar cobertura de rutas prioritarias y actualizar contenido que pierda clics con demanda estable. |
| Enero | Evaluar la ventana de tres meses contra el baseline y estacionalidad, explicar contribución y dependencias, y acordar el siguiente trimestre. |

La cadencia inicial propuesta es seguimiento operativo semanal y cierre mensual. Se confirma en kickoff.
Cada acción registra URL, problema, evidencia, impacto esperado, esfuerzo, responsable, fecha y verificación.
Una intervención aplicada no se marca como recuperación hasta observar su efecto en la fuente pertinente.

Prioridades editoriales expresadas por Natalia: rutas domésticas de Perú con menor cobertura, actualización
de rutas internacionales, experiencias alrededor del aeropuerto de llegada y refresh de artículos exitosos.
Revisar contenido e intención antes de abrir otra URL para evitar duplicaciones. Validar rutas y políticas
de equipaje con fuentes oficiales de SKY; no inferir disponibilidad comercial desde una base histórica.

## Medición y baseline

Organización: `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`. Host exacto: `blog.skyairline.com`.

- **GA4:** propiedad `354430952`, `SKY web GA4 - Prod`, calendario America/Santiago. Para adquisición, sesiones
  con landing en el blog; para consumo, vistas/actividad por página. Son cortes distintos.
- **GSC:** propiedad `https://blog.skyairline.com/`, búsqueda web, datos finales, calendario de Google/PT.
- **Septiembre 2026:** 38.332 sesiones con actividad en el host y 61.984 vistas GA4, todos los canales.
  GSC: 28.718 clics, 2.080.377 impresiones, CTR 1,380423% y posición media 7,769980.
- El top 50 GA4 ordena sesiones con actividad por página. Las sesiones de distintas páginas no son aditivas.
  No equiparar 38.332 sesiones de todos los canales con tráfico orgánico ni con los 28.718 clics GSC.
- Comparar meses completos, mismo host/propiedad/tipo y métricas compatibles; revisar estacionalidad y fechas
  de la migración. La cifra histórica declarada por el cliente todavía no es una meta calibrada.
- **La recuperación se mide contra el mismo mes del año anterior** (nov-25 44,0k · dic-25 49,5k · ene-26
  67,9k sesiones Organic Search), nunca contra septiembre: enero sube por temporada aunque no se haga nada.
  Los escenarios del [caso](caso-auditoria-2026-10/HECHOS.md) usan esa referencia.

El cuadro mensual incluye clics, impresiones, CTR y posición GSC; sesiones Organic Search de GA4 sobre el
alcance definido; páginas recuperadas/afectadas; resultados por marca/sin marca y país. Las acciones hacia
reservas se añaden sólo cuando su tracking y acceso se hayan verificado. El valor monetario sigue el
[método del indicador](INDICADOR_VALOR_ORGANICO_V1.md). No reemplaza conversiones, ingresos o incrementalidad.

## Operación y cierre

Flujo: intake → inventario/evidencia → diagnóstico → prioridades/brief → aprobación → ejecución → verificación
→ registro → medición. El estado vivo permanece en Notion. Este expediente fija el marco y sus fuentes.

Una entrega se acepta con alcance y período claros, enlace al artefacto/URL, revisión de la fuente real,
decisión del aprobador cuando corresponda y pendientes con dueño. Una compra de datos registra preview,
techo de gasto y recibo; una publicación conserva su aprobación y comprobación en la URL.

Cambios de alcance, metas o método se registran con fecha, motivo y aprobador. No alterar una edición
histórica de Insights ni modificar un baseline silenciosamente. Registrar cambio de metodología antes de
comparar series DataForSEO de distintas fórmulas ETV.

## Pendientes al 23-10-2026

Los siete frentes de investigación, responsables propuestos y checks de cierre se mantienen en la
[matriz de cobertura](COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md). Los pendientes del encargo del 23-10
(envío del correo formal con el PDF, restauración de los nueve artículos de Perú, export de la propiedad GSC
`www.skyairline.com`, acciones manuales y seguridad, acceso a WordPress, logo de SKY en Greenhouse y
validación de escenarios en el kickoff) tienen dueño y condición de cierre en la
[tabla del caso](caso-auditoria-2026-10/README.md#pendientes). Las dependencias comerciales y de operación
siguientes conservan su seguimiento propio; preparar documentos no las resuelve.

- Anexo firmado y cantidades finales.
- Acceso WordPress autenticado y registros técnicos de migración. Inventario público completado: 1.697
  posts, todos rastreados; incluye demo y duplicados, no equivale a piezas editoriales únicas.
- Registro de despliegue y cambios históricos de medición. Julio no dispone del GSC anterior; GSC conserva
  16 meses, así que los datos de jul–sep 2025 de la propiedad `www` o de dominio se pierden entre noviembre
  de 2026 y enero de 2027: pedir a SKY el acceso y exportarlos ahora. Mientras tanto se avanza con GA4,
  GSC actual, archivo y cohortes; atribución causal completa todavía no disponible.
- Último informe del proveedor anterior y prioridades de rutas confirmadas por SKY.
- Definición y validación del tráfico orgánico de entrada GA4 por host en informes automáticos.
- Validación con SKY de nombres, lectura y cadencia del indicador monetario.

## Referencias de ejecución

- [Discovery integral de cuentas SKY, 27-10](../../audits/client-portal/2026-10-27-sky-multi-account-discovery/README.md):
  una Organization, dos cuentas operativas; alternativas de bridge, identidad/acceso, sync/Notion, historia/ICO/
  Finance, medición e Insights y plan con dependencias. Propuesta sin configuración aplicada; preserva Diseño.
  El informe SEO exige **GA4 + GSC + motor AEO propio**, requisito de esa cuenta/servicio y no default global de SKY.
- [Discovery de medición del blog, 27-10](../../audits/insights/2026-10-27-sky-blog-discovery/README.md): host URL,
  GA4/GSC, histórico y proyección de citas AEO; las visitas IA en GA4 no sustituyen corridas del motor. BQ vacío
  para SKY en el rango consultado y PG sólo 11–25 de octubre al corte. Los dos dossiers conservan el diagnóstico inicial.
- [Skill de la cuenta](../../../.codex/skills/sky-blog-seo/SKILL.md), espejo en Claude.
- [Manual del indicador](../../manual-de-uso/growth/valorar-trafico-organico.md).
- [Funcionamiento del indicador](../../documentation/growth/valor-publicitario-organico.md).
- [Decisión técnica](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md).
- [Verificación GA4](../../audits/growth/2026-10-15-sky-ga4-connection-verification.md).
- [Verificación GSC y Excel](../../audits/growth/2026-10-15-sky-search-console-connection-verification.md).
- [Auditoría orgánica, migración e inventario](../../audits/growth/2026-10-15-sky-organic-channel-audit.md).
- [Auditoría consolidada del 23-10](../../audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md), que
  corrige y amplía la anterior (§6).
- [Caso de auditoría y entrega, octubre 2026](caso-auditoria-2026-10/README.md) y sus
  [hechos verificados](caso-auditoria-2026-10/HECHOS.md).
- Informe A4 y tablas de apoyo: `outputs/sky-blog-seo-audit-2026-10-23/`; generador del plan:
  [`scripts/seo/sky-blog-audit-report.ts`](../../../scripts/seo/sky-blog-audit-report.ts).
- [Expediente comercial antecedente](../../commercial/tenders/sky-blog-2026/README.md).
