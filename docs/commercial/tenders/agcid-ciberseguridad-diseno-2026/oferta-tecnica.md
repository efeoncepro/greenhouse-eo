# Oferta técnica — Línea gráfica, diseño visual web y diagramación de productos de ciberseguridad

> **Comprador:** AGCID / ANCI · **Proceso:** `1606-32-LE26` · **Origen:** public_tender · **Idioma:** es-CL.
> **Estado:** borrador técnico para revisión, no aprobado ni presentado. **Owner:** Julio Reyes / Commercial.
> **Cierre publicado:** 05/10/2026 15:10 America/Santiago. Proposal Studio: `workshop_only`, sin registro gobernado.

## Zona 0 — Ledger de evidencia

Los requerimientos proceden de los documentos del comprador consultados el 05/10/2026. El método siguiente
es una propuesta de Efeonce, no una afirmación de resultados o experiencia acreditada. Ante discrepancia prevalecen
las bases vigentes, sus modificaciones y respuestas oficiales. [Registro de fuentes](bases/LECTURA-Y-FUENTES.md).

| ref | Requisito / dato | Valor | Fuente exacta | as-of | audience |
| --- | --- | --- | --- | --- | --- |
| `E1` | Manual, diseño web y biblioteca de componentes | Tres productos iniciales y diagramación bajo solicitudes | Bases y resolución modificatoria p.17 | 2026-10-05 | client_facing |
| `E2` | Plazos iniciales corregidos | Manual 30 días; diseño web 60; biblioteca 70 desde reunión de inicio | Resolución modificatoria p.17 | 2026-10-05 | client_facing |
| `E3` | Diagramación y pago | Anexo modificado: 30 unidades (20 monolingües + 10 bilingües); cláusula de pago conserva hasta 20. P4: 60% del máximo, EUR 9.000. Discrepancia pendiente | Modificación pp.17,20–21; bases §11.10 p.18 | 2026-10-05 | client_facing |
| `E4` | Equipo y muestras | Sin dotación mínima predeterminada; referencias de trabajos efectivamente realizados | Resolución modificatoria p.4 | 2026-10-05 | client_facing |

## Zona 1 — Propuesta

# Propuesta técnica de diseño y diagramación

> EFEONCE GROUP SpA · RUT 77.357.182-1 · AGCID / ANCI · 1606-32-LE26.
> Borrador para revisión, 05/10/2026. Sin firma y no presentado.

## 1. Comprensión del proyecto

El proyecto de fortalecimiento de las capacidades de Latinoamérica y el Caribe en ciberseguridad necesita presentar información técnica compleja con claridad, coherencia institucional y continuidad entre sus documentos y su sitio web. La propuesta de Efeonce articula diseño editorial y digital en un sistema común que ANCI pueda reutilizar y que un equipo de desarrollo posterior pueda implementar.

La prioridad es que el usuario reconozca la jerarquía de la información, encuentre documentos y resultados, distinga idiomas y navegue entre repositorios y fichas sin perder contexto. Los entregables conservan los logotipos y obligaciones de visibilidad institucional y de la Unión Europea. La línea gráfica aplica al proyecto; no supone crear una marca o logotipo nuevo.

## 2. Producto 1: manual y plantillas institucionales

El manual define tipografías y jerarquías, paleta y usos funcionales del color, retícula, espaciado, tratamiento de tablas, gráficos y figuras, criterios de iconografía e imágenes y convivencia de logotipos. Incluye ejemplos de aplicaciones editoriales y digitales, así como reglas para mantener consistencia al incorporar nuevos contenidos.

La plantilla Microsoft PowerPoint incorpora portada animada, diapositivas maestras y elementos reutilizables. Se preparan al menos cuatro familias de plantillas Word: informe, minuta, invitación y programa. Según su finalidad, incluyen portada, estilos de títulos y cuerpo, índice automático, encabezados/pies, numeración y estilos de tablas/figuras. Los tamaños de papel y márgenes se acuerdan con ANCI entre las opciones exigidas.

| Entregable | Formatos propuestos | Control de reutilización |
| --- | --- | --- |
| Manual de aplicación | INDD/IDML y PDF digital | Estilos, vínculos y recursos editables; ejemplos y reglas documentadas. |
| Plantilla de presentación | PPTX | Maestras, portada animada y elementos editables. |
| Cuatro familias Word | DOCX y DOTX | Estilos nativos, numeración y guía breve de uso. |
| Recursos del sistema | Archivos fuente y formatos finales pertinentes | Inventario de recursos, procedencia y condiciones de uso. |

Se propone utilizar Adobe InDesign para la producción editorial, Photoshop/Illustrator para el tratamiento de recursos y Microsoft Office para las plantillas requeridas. La asignación final de profesionales y la acreditación de sus herramientas se incorporan en los antecedentes de la oferta antes de formalizarla.

## 3. Producto 2: diseño visual completo del sitio web

El diseño cubre las páginas tipo y vistas principales, con variantes para escritorio, tablet y móvil. El inventario inicial se contrasta con las bases y los contenidos de ANCI para evitar que una sección quede sin representación visual.

| Familia de vistas | Elementos y uso previsto |
| --- | --- |
| Inicio | Presentación del proyecto, acceso a contenidos y resultados, navegación y visibilidad institucional. |
| Repositorio de países y ficha | Navegación y filtros pertinentes; ficha reutilizable para los doce países contemplados. |
| Repositorio de estudios y ficha | Listado, búsqueda/filtros, metadatos, acceso a documentos y descargas. |
| Ley Modelo / Ley Marco | Vista de contenido y acceso a sus documentos, conforme a la denominación de ANCI. |
| Eventos y talleres | Listados y fichas, fechas, contenidos asociados y navegación entre actividades. |
| Galería, descargables y resultados | Vistas para recursos visuales, archivos, categorías y resultados del proyecto. |

Se diseñan los estados pertinentes de navegación, componentes activos, foco/hover, filtros seleccionados, resultados y ausencia de resultados, paginación y formularios con sus validaciones. El inventario define su pertinencia por página; no se limita a una portada o a capturas aisladas.

Se entrega un prototipo navegable de alta fidelidad en Figma y sus fuentes editables, junto con la matriz de vistas y estados y las especificaciones necesarias para su implementación posterior. Los textos finales y traducciones provienen de ANCI. Este producto corresponde al diseño visual y sus insumos; el desarrollo productivo, CMS, backend e integraciones se mantienen en el alcance que corresponde al equipo de desarrollo posterior.

## 4. Producto 3: biblioteca de componentes y especificaciones

La biblioteca convierte el diseño aprobado en componentes reutilizables. Incluye botones, navegación/menús, tarjetas, filtros, formularios, tablas, banners, etiquetas y demás componentes necesarios para las páginas definidas, con sus variantes, propiedades y estados pertinentes.

Los componentes se documentan con tipografía, color, espaciados, dimensiones, comportamiento adaptable y criterios de interacción. Se identifican tokens y relaciones entre estilos para que una actualización sea consistente en todo el sistema. La revisión contrasta una vista aprobada con sus componentes y su referencia HTML.

Se entregan la biblioteca Figma editable, HTML de referencia y documentación para transferencia al desarrollador: catálogo, ejemplos de uso, estados, estructura y especificaciones. El HTML demuestra estructura y apariencia para apoyar la implementación; no se presenta como un sitio productivo ni reemplaza el trabajo de desarrollo técnico.

## 5. Producto 4: diagramación de documentos

El alcance de producción contempla siete documentos de trabajo, dos productos de fondos de investigación y un documento de Ley Marco, cada uno en español e inglés: veinte versiones monolingües para publicación digital. Incluye además diez versiones bilingües consolidadas para impresión, según la modificación del Anexo 5.

Se parte de los contenidos definitivos y traducciones suministrados por ANCI. Cada documento recibe estilos, jerarquías, tablas y tratamiento de figuras coherentes con el manual. Se cotejan el texto, las referencias, la numeración y el índice antes de exportar. Los gráficos aportados que requieran tratamiento se trabajan preservando su información y con validación de la contraparte cuando sea necesario.

La extensión referencial de 150–200 páginas por documento informa la planificación; no se presenta como un máximo contractual. La producción conserva un registro por documento, idioma, versión y estado. La metodología adjunta organiza las primeras entregas dentro de las ventanas de cinco días hábiles y la incorporación de observaciones conforme a las bases.

| Versión | Archivo final | Fuente y comprobación |
| --- | --- | --- |
| Monolingüe ES | PDF optimizado para publicación digital | INDD/IDML, recursos y cotejo con contenido definitivo. |
| Monolingüe EN | PDF optimizado para publicación digital | INDD/IDML; revisión de estructura, expansión de texto y referencias. |
| Bilingüe consolidada | PDF de alta resolución para impresión | Fuente editable, orden de idiomas, paginación y especificaciones de imprenta acordadas. |

La diagramación no incorpora traducción, redacción técnica ni impresión física. Las correcciones de composición mantienen íntegro el contenido aprobado por ANCI.

## 6. Enfoque de diseño editorial y bilingüe

Proponemos una jerarquía de lectura que distinga título de publicación, sección, subtítulo, cuerpo, notas y leyendas. Las tablas y figuras conservan unidades, fuentes y correspondencia con las referencias del texto. El diseño permite recorrer el documento por índice y títulos sin que el tratamiento visual compita con la información técnica.

La composición en inglés se revisa por separado: longitud de títulos, saltos, tablas, leyendas y referencias. Los documentos consolidados mantienen separadores de idioma y una navegación comprensible. La estructura se comparte entre ES y EN; no se fuerza una paginación idéntica cuando perjudique la lectura.

Los formatos editables son parte de la entrega y se organizan para reutilización. Se verifican estilos nativos, recursos vinculados, licencias y fuentes antes de transferirlos. Los controles no se limitan al archivo de diseño: incluyen la revisión de todas las páginas del PDF final.

## 7. Muestras reales y coherencia entre productos

Para revisión de la propuesta se seleccionaron materiales existentes de SKY Airline, Berel, Bresler y Gobierno de Santiago. El dossier de muestras identifica qué decisión de diseño ilustra cada archivo y distingue los materiales de los respaldos contractuales de experiencia.

SKY aporta una referencia de diseño y producción multiplataforma con adaptación consistente entre mercados; existe una carta firmada de recomendación que identifica a Efeonce Group SpA y servicios durante 2025. Berel aporta informes diagramados para comparar jerarquías, tablas y lectura de contenidos. Bresler aporta una muestra de landing y un caso incluido en el portafolio web de Efeonce. Gobierno de Santiago aporta material de diseño y comunicación institucional del programa Cuidando a Quienes Cuidan.

Las muestras ilustran trabajos previos, no un diseño ya aprobado para AGCID ni una certificación de resultados. Se localizaron contrato y OC/factura de SKY, contrato y factura de Berel y certificado de recepción conforme/factura del Gobierno de Santiago, emitidos a Efeonce Group SpA. Su relación con los servicios, períodos acreditados y documentación a adjuntar se revisa en el Anexo 4 antes de formalizar la oferta. La selección final para presentación debe revisar también confidencialidad y permisos de uso de cada pieza.

## 8. Organización propuesta y transferencia

| Integrante | Responsabilidad propuesta | Interacción |
| --- | --- | --- |
| Julio Reyes | Coordinación del servicio, calendario, alcance y comunicaciones. | Interlocución con ANCI y seguimiento de aprobaciones. |
| Melkin Hernández | Diseño editorial, sistema gráfico y plantillas. | Producción documental y revisión cruzada con diseño de interfaces. |
| Andrés | Diseño de interfaces y biblioteca de componentes. | Prototipos, especificaciones y transferencia al desarrollador. |
| Valentina Hoyos Sánchez | Organización de contenidos, revisión editorial y observaciones. | Cotejo con los insumos de ANCI y trazabilidad de versiones. |

Esta distribución constituye una propuesta de organización; nombres completos, antecedentes profesionales, herramientas, dedicaciones y asignación final se validan antes de formalizar la oferta.

La entrega incluye inventario por producto, versión y formato, fuentes editables, archivos finales y guía de reutilización. La contraparte revisa y emite la conformidad que corresponda. El plan de trabajo y controles se desarrollan en el documento metodológico y la Carta Gantt adjuntos.

## Fuentes y estado de revisión

Esta propuesta se prepara desde las bases aprobadas por Resolución 263 y sus modificaciones y respuestas aprobadas por Resolución 287. Antes de formalizarla deben cerrarse la cotización, los antecedentes del oferente, las firmas y las discrepancias de unidades/plazos identificadas en la lectura del pliego. La preparación de este borrador no constituye una oferta presentada.


## Zona 2 — Composición y anexos

Fuente narrativa para completar la oferta técnica y anexos obligatorios. Julio autorizó crear la presentación mediante Artifact Composer el 05/10/2026. La revisión 3 conserva la línea nueva graphic-line-deck y sus imágenes en un PDF de 23 láminas, con titulares completos y muestras SKY en lugar del informe Berel; ver deck-outline.md y deck-render-record-INTERNO.json. No se cerró un render gobernado ni se presentó la oferta. La oferta económica circula por su carril y no integra costos internos en esta técnica.
