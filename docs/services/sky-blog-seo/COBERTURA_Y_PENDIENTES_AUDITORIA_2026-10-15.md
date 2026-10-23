# SKY · Cobertura y pendientes de la auditoría orgánica

## Delta 2026-10-23

- La [auditoría consolidada del 23-10](../../audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md)
  avanza los frentes 01 a 06 y aporta una primera lectura del 07 (§9 de ese documento). **Ningún check de
  cierre se marca:** cada frente sigue con una pieza de evidencia exigida que no existe todavía. Cifras y
  corte en [HECHOS.md](caso-auditoria-2026-10/HECHOS.md); expediente en el [caso](caso-auditoria-2026-10/README.md).
- Alerta: nueve posts de Perú vivos el 15-10 responden 404 el 23-10 sin redirección, y aparecieron 12 posts
  nuevos en el mismo lapso; hay que identificar quién retira contenido y restaurarlos.
- Cambia el criterio sobre el GSC anterior (§ Orden y trabajo): sigue sin bloquear el diagnóstico, pero ya
  no es sólo un límite histórico. GSC conserva 16 meses y los datos de jul–sep 2025 de la propiedad `www` o
  de dominio vencen entre noviembre de 2026 y enero de 2027; pedir el acceso a SKY y exportarlos es urgente.
- Ningún cambio se aplicó al CMS, redirecciones, Azure, GTM ni conexiones; implementación y resultados de
  recuperación siguen sin observarse.

| Frente | Avance del 23-10 | Sigue abierto |
| --- | --- | --- |
| SKY-AUD-01 | Cronología en tres etapas (previa, migración, posterior) con GA4 mensual; capa SEO perdida demostrada con archivo (AIOSEO 4.7.9.1 el 12-09-2025, nada hoy); redirecciones 1:1 en muestra de 110. | Registro de despliegue de TI, backups y reglas de redirección; último reporte del proveedor; export de la propiedad GSC `www` antes de que venza (nov-2026 a ene-2027). |
| SKY-AUD-02 | Copia indexable en Azure, robots.txt 404, sitemaps no enviados, canonical roto en `/page/2/` y 37 % de posts alcanzables por enlaces; 1.662 páginas con impresiones en septiembre. | Acciones manuales, problemas de seguridad, informe de páginas y CWV en la interfaz GSC, con captura fechada. |
| SKY-AUD-03 | Clasificación de 1.697 posts, 41 grupos canibalizados con 217 artículos, cobertura de rutas de Perú (17 destinos operados) y backlog de 30 piezas. | Contraste con Content Hub y revisión editorial declarada por cohorte; decisiones de consolidación aprobadas por SKY. |
| SKY-AUD-04 | Seis SERP en vivo (CL, 23-10) y series Semrush CL/PE; el blog fuera del top 10 para «sky equipaje». | Panel documentado de consultas de viajeros por país y dispositivo, con brecha de intención por URL. |
| SKY-AUD-05 | Subdominio con 262 dominios de referencia frente a 7.316 del dominio raíz. | Listado priorizado de enlaces externos con estado HTTP actual y acción. |
| SKY-AUD-06 | Laboratorio móvil por plantilla (LCP 5,7–20 s). | Datos de campo (PSI con cuota agotada; informe CWV de GSC pendiente). |
| SKY-AUD-07 | Clics del blog hacia `skyairline.com` proporcionales al tráfico (39,6k ene-26 → 13,2k sep-26). | Eventos, consentimiento y cadena hasta reservas; sin acceso a conversiones. |

Corte: 15-10-2026. Registro de cobertura del diagnóstico; no certifica nuevas comprobaciones ni cambios
en producción. Se actualiza al incorporar evidencia. Los resultados numéricos y artefactos conservan su
fuente en la [auditoría](../../audits/growth/2026-10-15-sky-organic-channel-audit.md).

## Estado real y alcance

- **Diagnóstico base:** entregado y verificado: inventario público, series GA4/GSC, muestras de mercado,
  regresiones comprobadas y prioridades.
- **Auditoría integral del blog:** parcial. Permanecen abiertos los siete frentes siguientes.
- **Primer lote:** preparado y revisable: veinte URLs priorizadas, diez iniciales, nueve artículos
  existentes y una decisión sobre una URL histórica 404. No equivale a diez artículos nuevos.
- **Implementación:** pendiente; no se aplicaron cambios al CMS, redirecciones, Azure o GTM.
- **Resultados de recuperación:** todavía no observados después de una intervención.

El alcance comprobado es blog.skyairline.com y el prefijo histórico www.skyairline.com/blog/.
Las páginas comerciales de rutas/destinos y el motor de reservas no recibieron auditoría técnica completa.
Trazar el recorrido desde el blog hacia vuelos es pertinente para medir la contribución del blog; auditar
todo el SEO de SKY requiere delimitar propiedades, mercados, responsables y cobertura adicional.
Este registro no amplía por sí solo el contrato ni autoriza compras, publicación o cambios de acceso.

## Siete frentes por completar

Los responsables son funciones propuestas; la asignación nominal y sus capacidades se confirman.
Cada cierre debe añadir fecha, fuente, universo o muestra y limitaciones. No marcar los checks por tener
un plan o un archivo preparado.

| ID / prioridad | Frente | Qué está cubierto | Investigación pendiente | Responsable / dependencia |
| --- | --- | --- | --- | --- |
| SKY-AUD-01 · Alta | Migración y medición histórica | Caída contrastada en GA4; transición observada 26–27/09/2025; archivo de tres superficies y cambios visibles de plantilla/GTM; redirects actuales ampliados. | Cronología de despliegues, backups/revisiones, reglas de redirección, historial GTM/consentimiento y último reporte del proveedor. Separar defectos previos, surgidos durante el traslado y posteriores. | Efeonce SEO/analítica; Leandro/infra/WP/GTM y Pilar para antecedentes disponibles. |
| SKY-AUD-02 · Alta | Indexación, rastreo y seguridad en Google | HTML/sitemaps públicos, canonicals y nueve inspecciones de URL. | Informes generales de indexación, exclusiones, rastreo, acciones manuales y seguridad; ampliar inspecciones por plantilla/estado y comprobar tratamiento de hosts alternativos cuando exista acceso. | Efeonce SEO + usuario autorizado de Search Console; owner infra para logs y Azure. Los readers de rendimiento no prueban acceso a todos los informes. |
| SKY-AUD-03 · Media, avanzable ahora | Calidad editorial y arquitectura temática | Censo de 1.697 posts con cuerpos y señales estructurales; duplicados exactos; lecturas editoriales acotadas y fichas del primer lote. | Clasificar intención, vigencia, utilidad, fuentes y relación con rutas por cohortes; revisar solapamientos y enlazado interno completo antes de decidir refresh, consolidación o retiro. | Efeonce editorial/SEO + Natalia/SKY; inventario, Content Hub, políticas y rutas oficiales. |
| SKY-AUD-04 · Media, avanzable ahora | Competencia y resultados de búsqueda | Muestra DataForSEO de 200 keywords por país CL/PE, intersecciones y consultas GSC expuestas. | Panel pertinente de búsquedas de viajeros; revisar competidores, intención, formatos y respuestas actuales; distinguir demanda, mezcla de consultas, posición y CTR. | Efeonce SEO; reutilizar capturas vigentes y delimitar cualquier compra nueva con preview/techo/recibo. |
| SKY-AUD-05 · Media, avanzable en parte | Autoridad y enlaces externos | Resumen de backlinks, referentes y muestra de pérdidas; concentración de enlaces en el host Azure identificada. | Verificar URLs externas relevantes hacia el prefijo antiguo, redirecciones y destinos rotos; separar enlaces editoriales independientes de copias/autorreferencias y acotar pérdidas reales. | Efeonce SEO; proveedor de enlaces y owner técnico de redirects. |
| SKY-AUD-06 · Alta | Experiencia móvil y rendimiento | Una corrida Lighthouse de cabina; dos páginas en escritorio/móvil; popup y CTA observados. | Muestra representativa por plantilla y tipo de contenido; navegación, lectura/CTA y carga repetible; contrastar con Core Web Vitals de campo donde exista cobertura suficiente. | Efeonce SEO/UX + owner WP; GSC/CrUX disponibles, staging y recursos de plantilla. |
| SKY-AUD-07 · Alta | Medición vigente y contribución comercial | Lecturas reales GA4/GSC; eventos observados, con form_submit y keyEvents separados de resultados de negocio. | Validar evento, consentimiento, continuidad entre dominios y destinos del CTA; trazar entrada orgánica → artículo → consulta de vuelos → compra cuando los accesos/datos lo permitan. Separar ayuda, fidelidad, empleo y adquisición. | Efeonce analítica + owner GTM/GA4 y responsable del recorrido de reservas/negocio de SKY. |

### Evidencia de cierre por frente

- [ ] **SKY-AUD-01:** cronología con fuentes fechadas y comparación de versiones disponible; nivel de
  confianza causal explícito. Si no quedan registros, documentar el límite y cerrar la investigación
  hasta donde la evidencia permite, sin fabricar una causa única.
- [ ] **SKY-AUD-02:** lectura de los informes disponibles, export/captura con fecha y alcance; muestreo
  justificado de URLs y exclusiones. Distinguir una acción manual comprobada de una hipótesis algorítmica.
- [ ] **SKY-AUD-03:** matriz URL/cluster/intención/mercado con criterio y evidencia de decisión, muestra
  editorial declarada y contraste con Content Hub. Un censo HTML no acredita revisión editorial de cada texto.
- [ ] **SKY-AUD-04:** panel documentado con consulta, país, dispositivo, fecha y resultado observado;
  brecha de respuesta/intención por URL. Intersección no equivale a cuota de mercado.
- [ ] **SKY-AUD-05:** listado de enlaces externos priorizados con origen, destino, estado actual,
  pertinencia y acción fundamentada. Un índice histórico de enlaces rotos no certifica HTTP actual;
  spam score no justifica un disavow masivo.
- [ ] **SKY-AUD-06:** muestra y condiciones documentadas, resultados por plantilla/dispositivo,
  separación campo/laboratorio y tareas concretas. Una puntuación de Lighthouse no representa todo el sitio.
- [ ] **SKY-AUD-07:** definición y prueba de eventos/cadena comercial con destino y consentimiento,
  trazabilidad a resultados disponibles y límites de atribución. No completar una compra real como parte
  de una inspección ni atribuir ventas sin evidencia. Si reservas queda fuera de acceso, declarar hasta
  qué paso se mide la contribución y el límite restante.

Los siete checks permanecen abiertos al crear este registro. Una falta de acceso puede dejar un frente
parcial con motivo y alternativa; no se traduce en «aprobado». Los hallazgos individuales conservan sus
estados de continuidad conforme al modelo compartido.

## Orden y trabajo que puede avanzar

Primero: medición vigente/contribución (07), indexación y seguridad (02), cronología de migración (01)
y experiencia móvil (06). En paralelo de trabajo pueden avanzar clasificación editorial (03),
competencia (04) y enlaces externos ya documentados (05), sin esperar un acceso de administración.
La organización de ese trabajo no crea autorización nueva para subagentes ni compras.

WordPress autenticado, owner Azure/CDN, versiones GTM y ciertos informes GSC requieren comprobar acceso.
No confundir permiso de lectura de rendimiento con capacidad de modificar el sitio ni usar credenciales
del WordPress institucional de Efeonce para SKY.

**El GSC anterior no está disponible, según Julio.** Se conserva como límite histórico, no como
solicitud abierta obligatoria ni impedimento general: continuar con GA4, GSC actual, archivo, cohortes y
registros recuperables. No reconstruir consultas/posiciones antiguas exactas a partir de estimaciones de
mercado o del dominio completo.

## Criterios analíticos que se conservan

- Comparar ventanas y calendarios explícitos. No sumar sesiones por página ni atribuir toda la caída
  al traslado por coincidencia temporal; ya existía deterioro previo y hay páginas que crecieron.
- GSC: controles de página y país independientes pueden reconciliar mientras el cruce conjunto queda
  parcial. Publicar el denominador y cobertura de cada extracción; quitar query o paginar hasta agotar
  no garantiza recuperar el total. Sin fila significa ausencia de registro visible, no demanda cero.
- Fecha CMS actual puede reflejar republicación. No usarla sola para fechar el origen de un artículo.
- Censo, muestra, diagnóstico editorial, indexación Google y experiencia de usuario son coberturas distintas.
- Una guía equivalente necesita evidencia semántica; HTTP 200 o parecido de slug no autorizan 301.
- DataForSEO conserva su metodología ETV y frescura. Reutilizar recibos/snapshots; no comprar el dominio
  padre para representar el histórico exacto de una carpeta.
- El [primer lote](PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md) ya tiene propuestas concretas. Su
  implementación no reemplaza los siete frentes de diagnóstico; ambos pueden progresar sin fingir cierre.
- Congelar baseline real T−28..T−1 al intervenir. Las referencias de septiembre permanecen analíticas;
  registrar fecha/actor/versión y comprobar implementación antes de observar T+28/T+56.

## Fuentes y continuidad

- [Auditoría y complementos](../../audits/growth/2026-10-15-sky-organic-channel-audit.md).
- [Plan del primer lote](PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md) y
  [marco de servicio](README.md).
- Evidencia local: .captures/sky-organic-audit-2026-10-15/{site,market,metrics,deepening,recovery-plan}/.
- Paquete preparado: outputs/sky-seo-recovery-2026-10-15/, con Excel/fichas/manifiestos y QA.
- [Modelo compartido de auditorías](../../operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md).
- Fuentes oficiales para la próxima verificación: [Acciones manuales](https://support.google.com/webmasters/answer/9044175?hl=es),
  [Problemas de seguridad](https://support.google.com/webmasters/answer/9044101?hl=es) y
  [Core Web Vitals](https://support.google.com/webmasters/answer/9205520?hl=es).

Los PDFs y libros ya entregados se conservan como cortes fechados de diagnóstico/preparación. Este registro
explicita la cobertura pendiente; no declara que se hayan actualizado copias en Notion ni ejecutado las pruebas.
