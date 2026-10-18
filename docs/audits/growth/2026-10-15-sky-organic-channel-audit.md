# Auditoría del canal de búsqueda orgánica del Blog SKY

Fecha: 15-10-2026. Estado: diagnóstico base y entregables verificados; auditoría integral parcial y
remediación pendiente. La [matriz de cobertura](../../services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md)
registra siete frentes abiertos con evidencia de cierre. Un plan de recuperación preparado no cierra esos frentes.

**Actualización de cobertura:** completar cronología de migración, informes Google de indexación/seguridad,
evaluación editorial por cohortes, competencia/SERP, enlaces externos, experiencia móvil y recorrido comercial.
El detalle y los checks permanecen en la matriz; esta actualización documental no realiza esas comprobaciones.
Alcance: `blog.skyairline.com` y prefijo histórico `www.skyairline.com/blog/`. El motor de reservas
no recibió auditoría técnica completa. Encargo autorizado por Julio con subagentes; lectura de GA4,
GSC, WordPress/HTML públicos, reunión de Notion, archivo histórico y DataForSEO. Sin cambios al CMS,
redirecciones, etiquetas, permisos, jobs, snapshots de Insights ni publicación/envío al cliente.

## Conclusión

La preocupación de Pilar está respaldada por GA4: promedio mensual de sesiones Organic Search con
actividad en el blog de **103.294 en julio–agosto 2025 a 43.279 en octubre–noviembre: −58,10%**.
El filtro OR de host actual/prefijo anterior se ejecutó dentro de Google y deduplica sesiones; no es
una suma manual de sesiones por host o página. Por día la baja es 57,41%. La ventana junio–agosto
frente a octubre–diciembre, con 92 días a ambos lados, baja 55,53%.

La transición de tráfico entre la ruta antigua y el subdominio se observa **26–27 septiembre 2025**.
GSC del host actual registra primeros clics el 26. La home antigua archivada el 12 de septiembre
todavía servía contenido y canonical en el prefijo anterior. Esto precisa la fecha aproximada de la
reunión, pero no sustituye el registro técnico de despliegue.

No se ha demostrado una penalización ni que toda la caída sea causada por la migración. Existía
deterioro previo: enero 2025 208.099 sesiones orgánicas, abril 94.468; julio/agosto 2025 estaban
43,34%/48,47% bajo los mismos meses de 2024. La propiedad GA4 completa mantiene su orgánico
aproximadamente estable entre julio–agosto/octubre–noviembre (+2,48%); es contexto descriptivo,
no control causal. La actualización de spam de Google de agosto 2025 tampoco prueba afectación de SKY.

Las cifras 80.000→40.000 mencionadas por Pilar no tenían unidad/filtro/mes exactos. Sus ejemplos de
dominios eran explícitamente inventados y no se usaron para definir origen/destino.

## Resultados actuales

| Área | Hecho comprobado | Lectura / prioridad |
| --- | --- | --- |
| Septiembre GSC | 28.718 clics, 2.080.377 impresiones, CTR 1,3804%, posición 7,770 | Clics −8,24% vs agosto, −5,18% por día; impresiones −13,40%, CTR/posición agregada mejoran. |
| Septiembre GA4 | 28.954 sesiones Organic Search con actividad en el ámbito del blog | No son necesariamente entradas ni equivalen a clics; sesiones por página no sumables. |
| Inventario WP público | 1.697 posts, 1 página, 14 categorías, 35 tags; todos los posts HTML 200/canonical propio/H1 | Incluye `/hola-mundo/`, 7 pares de cuerpos idénticos y 15 pares de títulos. No son 1.697 piezas únicas. |
| Sitemap | 1.754 URLs; todos los 1.697 posts incluidos | Incluye 14 layouts/demo HTTP 200 sin noindex; depurar preservando funciones del theme. |
| Host Azure público | Home y dos artículos 200, canonical autorreferente, sin noindex; similitud textual >96% | Confirmar dueño y función; consolidar/restringir sin romper origen/CDN. Indexación de Google no acreditada. |
| Enlaces heredados | 3.052 referencias a 917 destinos del prefijo antiguo en 867 posts | Actualizar a destino final verificado. Muestra de 25 llega 200; no extrapolar a todos los destinos. |
| Enlaces rotos actuales | 6 destinos 404 desde 24 artículos; 6 imágenes 404 en otros 2 | Corregir fuentes y destino pertinente, sin redirect global a home. |
| CTA | 68 posts exponen 70 shortcodes literales | Censo HTML; comprobación visual de una guía en escritorio/móvil. Reponer función y medir interacción. |
| Metadata/grafo | 1.697 sin meta description ni JSON-LD; sólo microdata de navegación | Corregir plantilla y contenido prioritario. Ausencia no prueba causa, penalización ni invisibilidad IA. |
| Archivos/paginación | 49 taxonomías y 4 autores sin canonical explícito; 11 taxonomías y 1 autor vacíos; rutas artificiales con canonical 404 | Política de indexación/archivos útiles y routing; no se demuestra bloqueo de paginación real. |
| Google URL Inspection | 8/9 URLs indexadas, canonical coincide | El noveno 404 histórico es anterior a la publicación actual de `/estaciones-climaticas/`, hoy 200. No desindexación general probada. |
| Rendimiento móvil | Cabina, una corrida Lighthouse 13.4: 39/100, LCP 11,52 s, TBT 869,5 ms, CLS 0,010 | Laboratorio simulado, no CrUX/INP/CWV de campo ni causa de caída histórica. |
| UX móvil | Popup automático tapa parte de lectura en 2 URLs; sin overflow horizontal observado | Revisar momento/tamaño con SKY. No se enviaron formularios ni se probó reserva. |
| Conversión | Eventos orgánicos incluyen 645 form_submit; keyEvents=0 en reporte | No equivalen a leads/ventas verificados; definir derivación a vuelos y atribución con consentimiento. |
| DataForSEO | Top10 abril→sept: CL −11,4%, PE −29,3%; ETV julio→sept CL +7,9%, PE −3,5% | Visibilidad no uniforme. Muestra 200 keywords/país; bases/fechas/metodología separadas de tráfico propio. |

## Priorización

1. SKY/owner técnico confirma función y tratamiento del host Azure. Efeonce especifica pruebas y verifica
   la superficie pública después. Excluir layouts/demo del sitemap/indexabilidad según su función.
2. Corregir CTA, seis destinos rotos e imágenes; actualizar enlaces antiguos por lotes. Optimizar imagen
   principal, JS/CSS y popup móvil sin eliminar tracking por inferencia. Dueño WP/infra + Efeonce.
3. Refresh de páginas con demanda: tipos de equipaje, SKY Plus, mascotas, panoramas familiares y Punta
   Cana; políticas y rutas con fuente oficial SKY. Empleo/formación se reportan separados de viajeros.
4. Desarrollar Perú doméstico sobre inventario existente, con Natalia aprobando intención/brief y SKY
   confirmando rutas. No abrir otra URL por alto volumen sin revisar cobertura e intención.
5. Definir eventos comerciales útiles y seguimiento a 28/56 días por cohorte URL/país/consulta, con
   fechas de intervención. Primeros 90 días desde inicio son ejecución y evaluación, no garantía.

Consultas verificadas: «donde viajar en verano» en `/destinos-de-verano/` tiene 19.102 impresiones,
0 clics, posición 8,15 en septiembre. «que hacer en vacaciones» en `/vacaciones-en-familia/` registra
7.379 impresiones y 0 clics. Son candidatos a revisar intención/SERP/respuesta, sin forecast de uplift.

## Integridad y límites

- GSC leído: `https://blog.skyairline.com/`, `siteFullUser`; la propiedad anterior no está disponible,
  según Julio. No se exige recuperarla para avanzar. Pendientes reporte del proveedor anterior, logs,
  despliegues, revisiones WP y versiones históricas GTM/consentimiento que puedan recuperarse.
- Calendarios GA4 America/Santiago y GSC Pacífico; meses completos para titulares. Octubre parcial
  no se compara con meses completos. Se conserva metadata; ausencia de flags no certifica ausencia de muestreo.
- La lectura GA4 de entradas/session_start tiene sampling; desgloses amplios presentan pérdida de detalle.
  Los titulares usan controles mensuales nativos separados; no se suman métricas por páginas/hosts.
- GSC: alias exactos de host/path con/sin slash se agrupan explícitamente, sumando clics/impresiones y
  ponderando posición por impresiones. Se conservan URLs originales, percentencoding y querystrings.
  Un diccionario que sobrescribe alias perdería 3.350 clics de septiembre.
- Country/device se releyeron sin filtro página y reconcilian 28.718. Consultas expuestas suman 9.301
  clics (32,4%); top 2.000 del Excel contiene 8.557. No extrapolar marca/no marca ni consultas ocultas.
- Cohorte WP con fecha actual hasta septiembre: 1.671 posts, 756 sin clics registrados y 20 sin impresiones.
  No equivale a noindex. Los posts actuales suman 27.815 clics; 903 restantes pertenecen a otras URLs.
- ETV `improved_layout_clickstream_v2`: antes de julio 2026, aproximación calibrada; desde julio,
  recalculado. Histórico del host nulo antes de septiembre 2025 no significa cero tráfico.
- Valor previo GSC×CPC USD 2.116,38, 3.824 clics/13,3% de cobertura, no se recalculó aquí. No sumar al
  valor nativo DataForSEO ni llamar ROI/ahorro a ninguna de estas estimaciones.
- Coste de esta auditoría: 12 tasks DataForSEO, USD **0,491816**, recibos y ledger verificados.
  No incluye USD 0,2406 del cálculo CPC anterior ni total mensual del ledger. Sin nuevos jobs recurrentes.

## Entregables y evidencia

- [Informe PDF A4, 14 páginas](../../../outputs/sky-organic-audit-2026-10-15/SKY-auditoria-organica-2026-10-15.pdf).
- [Excel, inventario y métricas](../../../outputs/sky-organic-audit-2026-10-15/SKY-auditoria-organica-inventario.xlsx),
  cinco pestañas, 1.697 filas de inventario, 21 meses GA4, 2.000 consultas, 44 filas de visibilidad.
- [Fuente HTML editable](../../../outputs/sky-organic-audit-2026-10-15/SKY-auditoria-organica-fuente.html).
- Evidencia local reproducible: `.captures/sky-organic-audit-2026-10-15/{metrics,site,migration,market}`.
  Capturas HTML completas comprimidas, requests sin credenciales, parámetros, resultados, recibos,
  inventarios y revisiones. No guardar tokens ni variables de entorno con secretos.
- Excel: recalculación, sensibilidad/restauración, scan errores, preview de todas las pestañas y ZIP
  readback en `workbook-build/{validation,zip-readback}.json`; Excel top 50 previo intacto.
- PDF: guarda DOM de desbordes, fuentes/imágenes listas, texto/metadata/A4/tags, navegación y contactos;
  revisión independiente de las 14 páginas. PyMuPDF no disponible: respaldo Poppler + PDF.js/pdf-lib.
  No certificación PDF/UA ni prueba de lectura asistiva.

El expediente [Servicio SEO del Blog SKY](../../services/sky-blog-seo/README.md) conserva alcance y
responsables. No se modificó arquitectura, skill ni runtime como parte de esta auditoría; no hay nueva
capacidad que requiera ADR. La remediación deberá registrar aprobación, lote, implementación y readback
antes de marcar cada acción resuelta.

## Profundización posterior: sin propiedad GSC anterior

El operador confirmó que no dispone de la propiedad anterior. Se profundizó usando accesos actuales,
sin nuevas compras, publicaciones ni cambios al sitio. [Complemento PDF de cuatro páginas](../../../outputs/sky-organic-audit-2026-10-15/SKY-profundizacion-migracion-2026-10-15.pdf).

**Corrección de hipótesis:** el agregado no orgánico caía casi igual que el orgánico en las ventanas
mensuales. Eso no demostraba un fallo general de GA4: al desagregar se observa composición distinta.
En ventanas iguales de 28 días (25 agosto–21 septiembre / 6 octubre–2 noviembre de 2025), controles
nativos: Organic Search 81.780→38.785 (−52,57%), Cross-network 22.395→1.382 (−93,83%), Direct
5.749→4.331 (−24,67%), Email 2.118→2.270 (+7,18%). No confundir este corte con el −58,1% mensual.

- Las sesiones orgánicas con `session_start` en el ámbito bajan 77.723→35.864 (−53,86%): persiste la
  dirección de pérdida al aproximar adquisición. Sesiones por página no sumables; no usar suma diaria
  como sustituto del control nativo del período.
- Stream GA4 `4641537641` antes/después. HTML archivado de home/cabina (12-09-2025) y curso
  (23-06-2025) emitía `G-KXJG4GDPFY`/`GTM-TDVWXLK`; hoy emite `GTM-KTT6XGSS`. Cambio visible de
  configuración, no prueba de GA4 apagado ni continuidad íntegra de triggers/consentimiento.
- Archivo confirma descripciones en aquellos dos artículos, ausentes hoy, y BlogPosting previo
  ausente ahora; la home ya carecía de descripción. Dos CTA del curso antes eran enlaces con imagen,
  hoy son shortcodes. Regresiones entre fechas comprobadas, sin fecharlas automáticamente en el traslado.
- Censo legacy ampliado: 917 strings / 916 solicitudes distintas; 897 terminan 200 y 19 terminan404,
  convergiendo en 18 destinos finales, desde 44 artículos. Unión con los seis destinos directos del
  primer censo: **20 destinos 404, 68 fuentes, 70 relaciones**; no sumar conjuntos ciegamente.
- Probe histórico adicional: slug largo de cambiar vuelo termina404 hoy y tuvo 3.433 sesiones por
  página pre /2.187 post. Coexistía con `/cambiar-vuelo-sky/` desde2025; no imponer alias/301 ni fecha
  de desaparición por inferencia. Con ese probe se conocen21 destinos404, uno sin enlace contextual detectado.
- Cohortes por path explícito:1.236 familias pre,1.025post,948en ambos. Entre139rutas con≥100sesiones
  antes y registro en ambos,132bajan y7crecen.288sin fila posterior sólo aportaban1.828vistas previas
  (1,9% de97.286); ausencia de fila no prueba borrado y algunos aliases actuales sí resuelven.
- GSC actual,372dcontinuos hasta30sep2026: crecimiento post hastaenero y caída posterior también
  visible en clics/impresiones. No se explica exclusivamente por recogidaGA4, aunque no reconstruye preGSC.
- Cinco controles semanales nativos Google/organic posteriores mantienen cocientes clics/sesiones
  próximos; no prueban cobertura ni validan el tagging anterior. Eventos/vista cambian, por UX o instrumentación.
- DataForSEO: contratos evaluados no permiten histórico exacto de carpeta para ese período. No se
  compró el dominio padre para simular `/blog/`. Cuatro consultasCL con demanda reutilizada son ejemplos,
  no una cesta representativa ni explicación causal del−58%.

Evidencia adicional: `.captures/sky-organic-audit-2026-10-15/deepening/`. Incluye controles nativos,
cohortes/URLs raw, HTML archivado,917destinos, fasesGSC, contratos y revisiones independientes.
Los artefactos iniciales permanecen intactos; el complemento documenta la nueva interpretación y límites.

## Plan de recuperación preparado después de la profundización

El operador autorizó avanzar con el lote completo. Se prepararon veinte URLs priorizadas, diez del
primer lote: nueve artículos actuales y una URL histórica 404. La guía larga rota y la actual de cambios
de vuelo se evalúan de forma coordinada; no representan dos artículos nuevos.
[Plan, secuencia y aceptación](../../services/sky-blog-seo/PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md).

Nueva extracción GSC, búsqueda web y datos finales del host actual:

| Fase | Días | Clics | Impresiones |
| --- | ---: | ---: | ---: |
| Noviembre–diciembre 2025 | 61 | 94.896 | 6.510.718 |
| Enero–febrero 2026 | 59 | 138.879 | 11.768.235 |
| Marzo–abril 2026 | 61 | 83.720 | 7.849.611 |
| Agosto–septiembre 2026 | 61 | 60.015 | 4.482.554 |

Los cortes independientes de página y de país del blog completo reconcilian exactamente con el control sin dimensión.
Las fases difieren en duración; normalizar por día y no interpretar la diferencia como efecto causal.

- No todas las páginas caen: noviembre–diciembre frente a agosto–septiembre, ambas de 61 días, cabina
  12.327→8.263 clics, bodega 2.184→6.004, perros 2.210→2.395 y cambiar vuelo 1.958→2.922.
  La selección incluye recuperación y protección de activos.
- La URL larga hoy rota recibió 4.748 clics en noviembre–diciembre y 1.300 en enero–febrero; no tiene
  filas visibles en las dos fases posteriores. Esto acota su evolución posterior al traslado, sin fechar
  exactamente el inicio del 404 ni demostrar que fuera alias de la guía actual.
- Cabina reduce exposición entre enero–febrero y agosto–septiembre aunque la posición media agregada
  mejora de 8,47 a 3,68. La mezcla de consultas y demanda importa: no atribuir toda pérdida de clics a
  posiciones peores.
- Chile aporta 32.910 clics y Perú 17.676 en agosto–septiembre, según los controles del blog completo.
- Las veinte URLs seleccionadas tienen control de 32.800 clics. Las 21.996 filas página×consulta×país
  muestran 11.784 (35,93%). El corte página×país filtrado tiene esos mismos clics; el cruce sin filtro
  suma 20.097 para todo el blog frente a 60.015 del control. Ambos cruces se etiquetan parciales.
  No inventar distribución completa de países por artículo ni extrapolar consultas ocultas.
- Las fechas CMS actuales no prueban creación reciente: Piura y Huacachina ya tienen filas de 2025.
  SKY Plus se evalúa desde su primera fase con datos visibles, no desde un cero supuesto.
- La landing histórica del CTA 4955 devuelve 404 al revalidarla; dibujar de nuevo el botón no resuelve
  el destino. Dos candidatos editoriales necesitan revisión de geografía/rutas antes de promoverlos.

Entrega en outputs/sky-seo-recovery-2026-10-15/: PDF de seis páginas, fuente HTML, Excel operativo,
fichas de las diez URLs, propuestas de metadatos y paquete técnico con manifiestos/runbook.
La evidencia reproducible vive en .captures/sky-organic-audit-2026-10-15/recovery-plan/.

Se reutilizó DataForSEO sin gasto adicional. Sin cambios al sitio, publicación ni configuración Azure/GTM.
Acceso WordPress autenticado, responsable técnico efectivo y aprobación editorial por comprobar.
Congelar T−28..T−1 al ejecutar; registrar fecha real y observar T+28/T+56. Estos cortes no son una
automatización ni una promesa de recuperación.

QA final del paquete: PDF de seis páginas revisado visualmente, sin desbordes, fuentes embebidas,
texto/contactos/navegación/A4 comprobados con PDF.js/pdf-lib y Poppler; no certificación PDF/UA.
Excel de cinco pestañas reabierto, ZIP leído independientemente, fórmulas/fechas/ceros y ausencia de errores
verificados. Baseline real y fechas de intervención vacíos; las nueve metas editoriales coinciden literalmente
con el manifiesto técnico, que añade el piloto del curso como décima propuesta. Revisión independiente de
las fichas y sus 45 consultas sin errores materiales. Validaciones conservadas en recovery-plan.
