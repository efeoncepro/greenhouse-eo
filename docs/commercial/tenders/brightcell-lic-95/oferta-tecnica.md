<!--
  FUENTE CLIENT-FACING — BORRADOR PARA REVISIÓN HUMANA
  Licitación privada Brightcell Logistics Chile · LIC-95 · Wherex

  Este documento es la fuente narrativa de la propuesta técnica. El deck y el PDF
  se compondrán desde esta fuente después de cerrar las decisiones abiertas y el
  ledger de evidencia. La propuesta económica se entrega por separado.
-->

# Oferta técnica — Plataforma comercial digital para Brightcell Chile

> **Licitación:** LIC-95 · Wherex  
> **Cliente:** Brightcell Logistics Chile Limitada  
> **Oferente:** Efeonce Group SpA  
> **Servicio:** Página web / plataforma comercial digital para Chile  
> **Fecha:** 30 de julio de 2026  
> **Estado:** Borrador para revisión y confirmación de alcance  
> **Idioma:** Español; alternativa bilingüe español–inglés por separado  
> **Validez:** Por confirmar en la propuesta económica

---

## Zona 0 — Ledger de evidencia

Las afirmaciones verificables de esta propuesta se fundan en las siguientes fuentes. Las capacidades,
claims, cifras, logos y casos de Brightcell que no estén confirmados por el cliente se presentan como
información pública de referencia y deberán validarse durante el descubrimiento.

| Ref. | Afirmación | Fuente | Fecha / estado | Audiencia |
|---|---|---|---|---|
| `BC-E1` | La licitación solicita una página web para Brightcell Chile, conectada visualmente con la operación regional. | Ficha Wherex LIC-95 y respuestas del comprador | Revisado 2026-07-30 | `client_facing` |
| `BC-E2` | Los objetivos declarados son posicionamiento de marca y generación de leads. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E3` | El proveedor debe proponer plataforma, contenido, SEO, analítica y medición de conversiones. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E4` | El contacto inicial será por correo electrónico y no se exige una integración técnica específica con el sitio regional. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E5` | Se solicita una propuesta mensual de redes sociales y posicionamiento en buscadores y motores de IA. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E6` | La versión bilingüe es deseable y debe presentarse como una alternativa de costo. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E7` | Las prioridades comerciales informadas son 3PL y almacenaje, valor agregado, transporte B2B y última milla B2C. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E8` | El foco sectorial informado es Hi Tech, telecomunicaciones y productos de alto valor. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E9` | La primera etapa debe operar de forma independiente en Chile y la plataforma debe poder evolucionar hacia la venta futura de equipos móviles. | Respuestas del comprador en Wherex | Revisado 2026-07-30 | `client_facing` |
| `BC-E10` | El sitio regional comunica servicios de 3PL, almacenaje, distribución, valor agregado y soluciones para tecnología y telecomunicaciones. | [brightcell-logistics.com](https://brightcell-logistics.com/) | Revisado 2026-07-30; claim público no auditado | `client_facing` |
| `BC-E11` | El sitio peruano constituye la referencia pública indicada por Brightcell para la experiencia de soluciones. | [brightcell-logistics.pe](https://brightcell-logistics.pe/) | Revisado 2026-07-30 | `client_facing` |
| `BC-E12` | El sitio regional muestra señales técnicas de WordPress; la decisión final de reutilización, editor y arquitectura queda sujeta a auditoría. | Auditoría técnica directa del sitio regional | Revisado 2026-07-30 | `client_facing` |
| `BC-E13` | El pago informado es a 30 días desde la factura. | Ficha Wherex LIC-95 | Revisado 2026-07-30 | `client_facing` |

No se incorporan como evidencia client-facing el diagnóstico interno, el benchmark competitivo, el
loaded cost, los márgenes, el blueprint del equipo ni las hipótesis de negociación.

---

## 1. Resumen ejecutivo

Brightcell Logistics Chile necesita una primera capacidad comercial digital local: una experiencia que
mantenga la confianza de una marca logística regional, explique con claridad su propuesta para el mercado
chileno y convierta el interés de compradores B2B en contactos comerciales medibles.

Efeonce propone construir una **plataforma comercial para Brightcell Chile**, comenzando por una página
web enfocada en las soluciones y sectores prioritarios definidos por Brightcell. La primera etapa será
simple de lanzar y operar de forma independiente, pero estará estructurada para crecer hacia nuevas
páginas por servicio o industria, una experiencia bilingüe y, cuando existan las condiciones comerciales
necesarias, una futura venta de equipos móviles.

La solución integra cinco capas:

1. **Estrategia y arquitectura:** ordenar la oferta logística según las decisiones del comprador.
2. **Web y contenido:** construir una experiencia clara, confiable y alineada con la marca regional.
3. **Conversión:** facilitar el contacto por correo o formulario y clasificar la demanda recibida.
4. **SEO, AEO y redes sociales:** hacer que Brightcell sea encontrable, comprensible y visible en los
   canales donde comienza la investigación B2B.
5. **Medición y evolución:** conocer qué contenidos, servicios y fuentes generan señales comerciales para
   decidir el siguiente ciclo.

El resultado no será solamente una landing publicada. Será una base comercial medible, con límites claros
de alcance y una ruta de evolución que evite convertir la primera etapa en un e-commerce o una integración
tecnológica sobredimensionada.

---

## 2. Comprensión del requerimiento

Brightcell no está solicitando únicamente diseño o desarrollo web. Está solicitando que el proveedor tome
decisiones que todavía no están cerradas: plataforma, contenidos, SEO, analítica, conversión, canales
mensuales y posicionamiento en buscadores y motores de IA (`BC-E3`, `BC-E5`).

La propuesta debe resolver simultáneamente cuatro tensiones:

- **Regional y local:** la página debe sentirse inequívocamente Brightcell, pero hablarle a las
  necesidades y prioridades del mercado chileno.
- **Complejidad y claridad:** Brightcell comunica una oferta logística amplia; el comprador necesita
  entender rápidamente qué solución aplica a su operación.
- **Contacto y operación:** el objetivo no es solo generar visibilidad, sino abrir conversaciones que
  Brightcell pueda recibir, clasificar y seguir (`BC-E2`, `BC-E4`).
- **Simplicidad y evolución:** la primera etapa debe ser útil sin construir desde el inicio un e-commerce,
  un CRM complejo o integraciones que el comprador todavía no ha definido (`BC-E9`).

La tesis de Efeonce es:

> **Brightcell Chile puede convertir su presencia regional en una capacidad comercial local: una puerta de
> entrada clara para compradores de alto valor, conectada con la marca regional y preparada para medir y
> evolucionar la demanda.**

---

## 3. Lectura estratégica de Brightcell Chile

La presencia pública de Brightcell comunica soluciones de cadena de suministro, almacenamiento,
distribución y servicios de valor agregado, con especial relevancia para tecnología y telecomunicaciones
(`BC-E10`). La referencia peruana muestra una arquitectura de soluciones más desarrollada, que Brightcell
ha indicado como punto de comparación (`BC-E11`).

Para Chile, Brightcell ha priorizado:

1. 3PL y almacenaje;
2. servicios de valor agregado;
3. transporte B2B;
4. última milla B2C;
5. industrias Hi Tech, telecomunicaciones y productos de alto valor.

Esta jerarquía debe gobernar el contenido, la arquitectura de la página, los llamados a la acción y la
operación mensual. No se debe presentar cada servicio con el mismo peso ni trasladar automáticamente todos
los claims regionales a Chile sin validación del equipo local.

La oportunidad consiste en traducir la capacidad operacional a una experiencia B2B que responda preguntas
concretas:

- ¿Qué problema logístico puede resolver Brightcell para mi operación?
- ¿Qué servicio corresponde a mi necesidad?
- ¿Tiene experiencia con productos de alto valor, tecnología o telecomunicaciones?
- ¿Qué ocurre después de solicitar información?
- ¿Cómo puede Brightcell demostrar control, trazabilidad y continuidad?

---

## 4. Solución propuesta

### 4.1. Concepto de solución

La primera plataforma comercial de Brightcell Chile será una **puerta de entrada local para la demanda
B2B**, no una réplica aislada del sitio regional.

La experiencia combinará:

- continuidad visual y de navegación con la marca regional;
- mensajes específicos para Chile y sus sectores prioritarios;
- jerarquía por problemas, servicios e industrias;
- llamados a la acción que conduzcan a un contacto comercial;
- SEO técnico y editorial desde el lanzamiento;
- medición de conversiones y fuentes de demanda;
- una base extensible para nuevas páginas, idiomas y capacidades transaccionales.

### 4.2. Arquitectura inicial de contenidos

La arquitectura definitiva se validará en el descubrimiento, pero la primera versión se organizará en
torno a los siguientes bloques:

1. **Propuesta de valor local:** qué representa Brightcell para un comprador en Chile.
2. **Soluciones prioritarias:** 3PL y almacenaje; valor agregado; transporte B2B; última milla B2C.
3. **Industrias foco:** Hi Tech, telecomunicaciones y productos de alto valor.
4. **Capacidades y confianza:** experiencia, control, trazabilidad, seguridad y continuidad, solo con
   claims aprobados por Brightcell.
5. **Cómo comenzar:** información mínima necesaria para evaluar una necesidad logística.
6. **Contacto comercial:** correo o formulario, con clasificación básica de servicio e industria.

La arquitectura se preparará para que, en una segunda etapa, los servicios o industrias con mayor demanda
puedan convertirse en páginas independientes sin rehacer la plataforma.

### 4.3. Conversión y seguimiento

La conversión inicial será un **contacto comercial por correo electrónico**, tal como indicó Brightcell
(`BC-E4`). Efeonce propone facilitarla mediante:

- llamados a la acción visibles y diferenciados;
- formulario de contacto breve, si Brightcell lo aprueba;
- campos para servicio de interés, industria, ubicación y necesidad general;
- confirmación de recepción y protección contra spam;
- identificación de fuente y campaña mediante UTMs;
- registro del contacto y estado de seguimiento;
- definición conjunta del responsable y tiempo de respuesta.

No se prometerá un volumen de leads. Efeonce se compromete a construir la infraestructura de conversión,
medir su funcionamiento y optimizarla con base en datos reales.

### 4.4. HubSpot como capa de trazabilidad

Como diferenciador, Efeonce propone incorporar una activación inicial de HubSpot como capa de orden
comercial. Su función no será convertir la primera etapa en un proyecto complejo de automatización, sino
ayudar a que el contacto no se pierda después de llegar por correo o formulario.

La activación propuesta puede incluir:

- configuración inicial de la cuenta y usuarios definidos por Brightcell;
- registro de contactos y empresas;
- propiedades básicas de servicio, industria, país y fuente;
- pipeline inicial para distinguir contacto recibido, revisión, oportunidad y cierre;
- notificación al responsable comercial;
- dashboard básico de contactos y oportunidades;
- documentación y transferencia al equipo de Brightcell.

La licencia, el nivel de producto, el número de usuarios, los contactos, los impuestos y la renovación se
detallarán en la propuesta económica. HubSpot AEO se presenta como una herramienta de monitoreo,
comparación y recomendación para visibilidad en motores de respuesta; no como una garantía automática de
citaciones ni de generación de demanda.

---

## 5. Plataforma, diseño y desarrollo

### 5.1. Criterio de plataforma

La plataforma debe permitir que Brightcell publique y mantenga contenidos sin construir una solución
innecesariamente compleja. También debe dejar espacio para nuevas páginas, contenidos bilingües y una
eventual evolución hacia catálogo o venta de equipos.

La recomendación preliminar es evaluar una implementación sobre **WordPress administrable**, dado que el
sitio regional presenta señales de ese ecosistema (`BC-E12`). La decisión final se tomará después de
auditar:

- propiedad y acceso al sitio regional;
- hosting y ambientes disponibles;
- tema y componentes actuales;
- plugins, seguridad y rendimiento;
- compatibilidad con la autonomía operacional de Chile;
- necesidades reales de edición y mantenimiento.

Elementor no se incluye como una promesa automática. Se utilizará solo si la auditoría demuestra que es
conveniente para la continuidad del sistema, el control editorial y el rendimiento. De lo contrario, se
priorizará un editor controlado y una arquitectura liviana.

### 5.2. Dirección de experiencia

La experiencia visual conservará el lenguaje regional sin replicar mecánicamente cada sección. El diseño
debe comunicar:

- precisión y control operacional;
- escala y confiabilidad;
- especialización en productos de alto valor;
- tecnología aplicada a la logística;
- claridad para decisores B2B.

El trabajo de diseño incluirá estructura responsive, jerarquía visual, componentes reutilizables,
llamados a la acción y estados necesarios para el contacto. Las imágenes, logos, certificaciones y claims
de Brightcell se utilizarán únicamente con autorización y archivos entregados o aprobados por el cliente.

### 5.3. Contenido y copywriting

Efeonce desarrollará la arquitectura de mensajes, textos iniciales, llamados a la acción y contenidos
necesarios para la primera versión. Brightcell validará la exactitud de:

- servicios disponibles en Chile;
- cobertura geográfica;
- sectores atendidos;
- cifras operacionales;
- clientes y logos;
- certificaciones;
- casos y resultados;
- promesas de nivel de servicio.

El contenido traducirá capacidades logísticas complejas a beneficios entendibles para compradores:

- control;
- trazabilidad;
- seguridad;
- precisión;
- continuidad operacional;
- escalabilidad.

---

## 6. SEO y AEO

### 6.1. Fundamentos de lanzamiento

La primera etapa incorporará una base de posicionamiento técnico y semántico que permita que los
buscadores y motores de respuesta comprendan a Brightcell Chile:

- arquitectura de URLs y navegación indexable;
- titles, encabezados y metadescripciones;
- sitemap y política de rastreo;
- datos estructurados apropiados para la organización y sus páginas;
- consistencia de entidad: nombre, país, servicios y sectores;
- contenido orientado a preguntas reales de compradores;
- enlaces internos entre servicios, industrias y contacto;
- rendimiento, responsive y buenas prácticas técnicas;
- configuración de Google Search Console y Bing Webmaster Tools, si Brightcell entrega los accesos;
- GA4 y Google Tag Manager para medición, si corresponde al entorno de implementación.

### 6.2. Operación mensual opcional

La operación mensual se organizará como un ciclo de **diagnóstico, priorización, intervención y aprendizaje**.
Cada mes Brightcell recibirá un backlog priorizado, acciones ejecutadas y una lectura de lo que conviene hacer a
continuación.

El ciclo propuesto es:

1. revisar consultas, páginas, conversiones y señales de demanda;
2. priorizar oportunidades de contenido y optimización;
3. producir o actualizar contenidos por servicio e industria;
4. reforzar claridad, enlazado, datos estructurados y citabilidad;
5. medir visibilidad en búsqueda y motores de respuesta;
6. documentar aprendizajes y decidir el siguiente ciclo.

### 6.2.1. Qué hacemos con SEO

SEO trabajará la demanda que ya existe en buscadores y la capacidad de la web para responderla. El trabajo
mensual puede incluir:

- análisis de consultas y páginas con potencial comercial;
- optimización de títulos, encabezados, metadescripciones y contenidos;
- mejoras de arquitectura, enlazado interno y páginas de servicio/industria;
- revisión de rastreabilidad, indexación, rendimiento y errores técnicos;
- actualización de datos estructurados cuando corresponda;
- priorización de contenidos según servicio, industria y etapa de decisión;
- medición de impresiones, clics, consultas, páginas de entrada y conversiones.

### 6.2.2. Qué hacemos con AEO

AEO extenderá ese trabajo para que Brightcell sea comprendida y considerada por motores de respuesta. El trabajo
mensual puede incluir:

- mapa de entidades, servicios, industrias y atributos que Brightcell debe comunicar con consistencia;
- identificación de preguntas de compradores y construcción de respuestas claras y verificables;
- mejora de la estructura de contenidos para facilitar recuperación, comprensión y citabilidad;
- revisión de fuentes, claims, autores, referencias y señales de confianza;
- monitoreo de consultas o prompts acordados y comparación con referentes competitivos;
- recomendaciones accionables sobre qué contenido, evidencia o señal de autoridad debe reforzarse;
- reporte de visibilidad y citabilidad, siempre separado de la atribución de leads o ventas.

SEO y AEO compartirán investigación, temas, entidades y contenidos, pero no son la misma tarea: SEO busca
capturar demanda y visitas; AEO busca mejorar comprensión, recuperación y citabilidad en respuestas.

No se prometerán posiciones específicas, tráfico mínimo, citaciones en ChatGPT, Gemini o Perplexity ni un número
garantizado de leads. La operación se medirá por señales de visibilidad, calidad de contenido, conversiones y
aprendizajes accionables.

### 6.3. Relación con contenido y redes sociales

SEO, AEO y redes sociales cumplirán funciones distintas dentro del mismo sistema:

- **SEO:** capturar demanda existente en buscadores.
- **AEO:** mejorar la comprensión y citabilidad de la entidad y sus contenidos en motores de respuesta.
- **LinkedIn:** construir autoridad y confianza frente a decisores B2B.
- **YouTube:** alojar demostraciones, explicaciones y evidencia operacional cuando exista material aprobado.
- **Instagram:** apoyar la dimensión visual de la marca y la cultura operacional.
- **Web:** convertir el interés en una conversación comercial.
- **HubSpot:** ordenar el contacto y visibilizar el avance.

---

## 7. Social Media mensual opcional

La propuesta mensual de redes sociales se diseñará alrededor de los servicios y sectores priorizados por
Brightcell, no alrededor de una publicación genérica de marca.

### 7.1. Canales recomendados

**LinkedIn** será el canal principal por su relación con compradores, aliados y talento B2B. El contenido
puede abordar:

- problemas de cadena de suministro;
- almacenamiento y control;
- valor agregado aplicado a tecnología y telecomunicaciones;
- trazabilidad y continuidad;
- casos, procesos y aprendizajes;
- capacidades y cultura operacional.

**YouTube** funcionará como biblioteca de evidencia cuando Brightcell disponga de imágenes, vocerías y
autorizaciones suficientes. **Instagram** tendrá un rol complementario de confianza visual y marca. Otros
canales se recomendarán solo si existe audiencia, material y capacidad de respuesta suficientes.

### 7.2. Servicio de gestión

El servicio mensual se operará como un sistema editorial y de autoridad B2B. No se trata de publicar piezas
aisladas, sino de transformar capacidades, evidencia y preguntas comerciales de Brightcell en contenido que
construya confianza y conduzca a una acción.

El flujo mensual podrá incluir:

- **Inteligencia editorial:** revisar preguntas, temas, señales de audiencia y prioridades comerciales.
- **Planificación:** definir pilares, calendario, formatos, responsables, CTA y materiales requeridos.
- **Producción:** redactar, diseñar, adaptar por canal y editar video corto desde material disponible.
- **Publicación:** programar contenidos aprobados y mantener consistencia visual, editorial y de marca.
- **Comunidad y escucha:** identificar preguntas, objeciones y señales que puedan alimentar la web, SEO/AEO o
  seguimiento comercial.
- **Medición:** reportar alcance cualificado, interacciones útiles, visitas, clics, consultas y acciones derivadas.

Los pilares iniciales podrán ser:

1. **Autoridad operacional:** cómo Brightcell controla, almacena, distribuye y agrega valor.
2. **Especialización sectorial:** respuestas para Hi Tech, telecomunicaciones y productos de alto valor.
3. **Prueba y confianza:** procesos, trazabilidad, continuidad, instalaciones, equipo y casos aprobados.
4. **Conversación comercial:** preguntas frecuentes, criterios para elegir una solución y rutas para solicitar
   información, cotización o agendar una conversación.

El resultado mensual no será solo un calendario publicado. Será un conjunto de contenidos, aprendizajes y señales
que alimentan la web, el posicionamiento y la conversación comercial.

La cantidad de canales, publicaciones, piezas, videos, ventanas de respuesta y producción especial se
definirá en la propuesta económica. La inversión en medios pagados, producción audiovisual especial,
vocería, eventos y cobertura 24/7 quedan fuera del alcance base salvo contratación expresa.

### 7.3. Cómo se conectan RRSS, SEO/AEO y conversión

La operación integrada seguirá esta lógica:

```text
Preguntas y señales sociales
        ↓
Temas, entidades y contenidos priorizados
        ↓
Web y páginas de solución optimizadas para SEO/AEO
        ↓
CTA: solicitar información, cotización o agendar conversación
        ↓
Correo/formulario + HubSpot, si se activa
        ↓
Aprendizaje para el siguiente ciclo editorial y de búsqueda
```

RRSS amplifica confianza y conversación; SEO captura demanda existente; AEO mejora la comprensión y citabilidad;
la web convierte; HubSpot ayuda a ordenar el contacto. Cada disciplina conserva su función y se mide dentro del
mismo circuito comercial.

---

## 8. Metodología de trabajo

### Fase 1 — Descubrimiento y definición

**Objetivo:** convertir decisiones abiertas en un brief aprobado.

Actividades:

- reunión de inicio y responsables;
- validación de capacidades disponibles en Chile;
- definición de audiencias, industrias y casos de uso;
- revisión del sitio regional y de la referencia peruana;
- auditoría de plataforma y accesos;
- definición de claims, cifras, logos y materiales aprobados;
- definición del correo receptor y flujo de seguimiento;
- arquitectura de información, mensajes y conversiones;
- definición de medición y criterios de aceptación.

**Entregables:** brief aprobado, mapa de contenidos, arquitectura inicial, matriz de claims y plan de
medición.

### Fase 2 — Contenido, diseño y construcción

**Objetivo:** convertir la arquitectura aprobada en una experiencia publicada y medible.

Actividades:

- redacción y revisión del contenido;
- diseño visual alineado con el sistema regional;
- desarrollo de la página y componentes;
- configuración de SEO técnico;
- implementación de formularios o canal de contacto;
- configuración de analítica y eventos;
- activación inicial de HubSpot, si se contrata;
- revisión responsive, accesibilidad, rendimiento y seguridad.

**Entregables:** versión candidata, contenidos finales aprobados, configuración de medición y documentación
de operación.

### Fase 3 — Validación, publicación y transferencia

**Objetivo:** publicar una primera versión confiable y dejar capacidad instalada.

Actividades:

- revisión de contenido y claims por Brightcell;
- QA funcional y visual;
- validación de enlaces, formularios y notificaciones;
- prueba de eventos y fuentes;
- publicación coordinada;
- verificación de indexación y medición;
- capacitación breve y entrega de documentación.

**Entregables:** página publicada, checklist de lanzamiento, reporte de medición inicial y handoff.

### Fase 4 — Optimización inicial y operación mensual opcional

**Objetivo:** usar las primeras señales para decidir qué mejorar.

Actividades:

- revisión de contactos y calidad de la información recibida;
- análisis de consultas y comportamiento;
- ajustes de llamados a la acción y contenidos;
- baseline de visibilidad SEO/AEO;
- contenidos y redes sociales según plan contratado;
- reporte ejecutivo y backlog priorizado.

---

## 9. Roadmap preliminar

El calendario final se definirá después de confirmar accesos, responsables, capacidades, cantidad de
secciones y fecha objetivo de lanzamiento.

| Etapa | Hito | Dependencia principal |
|---|---|---|
| Descubrimiento | Brief, claims y arquitectura aprobados | Disponibilidad de Brightcell y accesos |
| Definición | Copy y experiencia priorizados | Validación de servicios y sectores |
| Construcción | Página candidata y medición configurada | Plataforma, contenidos y materiales |
| QA | Criterios funcionales, visuales y técnicos aprobados | Revisión conjunta |
| Lanzamiento | Página publicada y contactos verificables | Aprobación final de Brightcell |
| Optimización | Primer reporte y backlog de mejoras | Datos de tráfico y contactos |

No se fijan fechas artificiales antes de conocer la fecha objetivo y las dependencias de Brightcell.

---

## 10. Medición y gobernanza

### 10.1. Eventos de medición

La configuración se acordará con Brightcell y podrá incluir:

- clic en correo;
- envío de formulario;
- selección de servicio;
- selección de industria;
- descarga de material, si existiera;
- clic desde redes sociales;
- origen, campaña y medio;
- avance del contacto en el pipeline, si se activa HubSpot.

### 10.2. Definiciones de negocio

Para evitar que toda interacción se reporte como éxito, se distinguirá entre:

- **contacto:** persona o empresa que dejó un dato o inició una conversación;
- **lead calificado:** contacto que corresponde a un servicio, industria o necesidad atendible;
- **oportunidad:** lead que Brightcell decide trabajar comercialmente;
- **resultado comercial:** estado definido por Brightcell en su proceso de venta.

### 10.3. Reportería

La operación mensual podrá entregar un reporte que integre:

- rendimiento técnico;
- tráfico y consultas;
- conversiones y fuentes;
- contenidos publicados y aprendizajes;
- visibilidad SEO/AEO;
- desempeño de redes sociales;
- oportunidades y recomendaciones del siguiente ciclo.

El reporte no reemplaza el seguimiento comercial de Brightcell. La calidad y velocidad de respuesta de los
leads dependerá del responsable que Brightcell designe.

### 10.4. Gobernanza

Efeonce propondrá una cadencia de reuniones y aprobaciones. Brightcell deberá designar responsables para:

- aprobar claims y contenidos;
- entregar materiales y accesos;
- validar capacidades locales;
- recibir y trabajar los contactos;
- aprobar publicación y cambios de alcance.

---

## 11. Equipo y ownership

Efeonce asignará un responsable de cuenta y coordinará las disciplinas necesarias para ejecutar la solución:

| Rol | Responsabilidad |
|---|---|
| Responsable de cuenta / estrategia | Dirección, coordinación, decisiones y relación con Brightcell |
| Estrategia digital y contenido | Posicionamiento, arquitectura, mensajes y contenidos |
| Diseño | Sistema visual, experiencia responsive y piezas de apoyo |
| Desarrollo web | Implementación, componentes, rendimiento y publicación |
| SEO/AEO | Arquitectura de búsqueda, entidad, contenido, medición y optimización |
| Analítica / CRM | Eventos, fuentes, definiciones de funnel y HubSpot, si aplica |
| Social Media | Plan editorial, producción, publicación, escucha y reporte mensual |

Los nombres, dedicaciones y respaldos del equipo se confirmarán en la versión final de la oferta y en sus
anexos correspondientes. No se asignarán personas o fotografías sin validación interna y autorización de
uso.

---

## 12. Alcance de la primera etapa

### Incluye conceptualmente

- descubrimiento y definición de la propuesta local;
- arquitectura de información y mensajes;
- diseño de la experiencia inicial;
- desarrollo y publicación de la página acordada;
- contenido inicial sujeto a validación;
- SEO técnico y semántico de lanzamiento;
- analítica y eventos de conversión;
- canal de contacto por correo o formulario;
- QA responsive, funcional, accesibilidad y rendimiento;
- documentación y transferencia;
- activación inicial de HubSpot, si se incluye en la alternativa contratada.

### Evoluciones opcionales

- versión bilingüe español–inglés;
- páginas adicionales por servicio o industria;
- catálogo o venta de equipos móviles;
- automatizaciones y nurturing;
- integraciones con CRM, ERP, WMS o TMS;
- expansión a otros mercados;
- operación mensual de SEO/AEO;
- operación mensual de redes sociales;
- medios pagados;
- producción audiovisual especial.

---

## 13. Supuestos, dependencias y exclusiones

La propuesta económica deberá precisar cantidades, plazos y límites. Para esta versión técnica se establecen
los siguientes supuestos:

- Brightcell entregará acceso o información suficiente para auditar la plataforma regional y definir la
  implementación.
- Brightcell validará las capacidades, servicios, cifras, clientes, logos, certificaciones y casos que
  puedan comunicarse para Chile.
- Brightcell designará un responsable para aprobar contenidos y trabajar los contactos.
- La integración inicial será visual y de navegación con el ecosistema regional, salvo que se acuerde una
  integración técnica adicional (`BC-E4`).
- El contacto inicial será por correo o formulario; CRM, automatizaciones e integraciones avanzadas se
  cotizarán según alcance.
- La primera etapa no incluye automáticamente e-commerce completo, pagos, inventario, despacho, ERP, WMS,
  TMS, atención 24/7 ni compra de medios.
- La alternativa bilingüe incluirá traducción, revisión y mantenimiento según el alcance económico que se
  apruebe.
- Dominios, hosting, licencias, traducciones especializadas, bancos de imágenes, servicios de terceros y
  producción especial se identificarán por separado cuando correspondan.
- Cualquier cambio que altere páginas, idiomas, integraciones, entregables, canales o volumen de producción
  se evaluará mediante control de alcance.

---

## 14. Por qué es seguro adjudicar esta solución

La propuesta reduce los riesgos principales de la primera etapa:

| Riesgo | Cobertura propuesta |
|---|---|
| Una página genérica que no genera conversaciones | Arquitectura por servicios, industrias, CTA y medición desde el lanzamiento |
| Mensajes regionales que no representan la realidad chilena | Matriz de claims y validación de capacidades locales |
| Un proyecto que crece sin control | Fases, alcance base, opciones y exclusiones explícitas |
| Un e-commerce prematuro | Arquitectura extensible, con comercio condicionado a catálogo, inventario, despacho y pagos definidos |
| Contactos que se pierden | Correo/formulario medible, responsable, clasificación y HubSpot opcional |
| SEO/AEO tratado como promesa abstracta | Fundamentos técnicos, contenido, medición y optimización sin garantías artificiales |
| Dependencia de una sola persona | Responsable de cuenta, disciplinas especializadas y documentación de transferencia |

Efeonce no propone esconder las decisiones pendientes. Propone convertirlas en un proceso de descubrimiento,
validación y control que permita a Brightcell lanzar con claridad y evolucionar con evidencia.

---

## 15. Matriz de cumplimiento de la solicitud

| Solicitud informada por Brightcell | Respuesta en esta oferta | Estado |
|---|---|---|
| Crear una página web para Chile | Secciones 1, 4 y 5: plataforma comercial local y arquitectura inicial | Cubierto |
| Mantener conexión con la marca regional | Secciones 2, 4 y 5: continuidad visual, de navegación y de sistema | Cubierto; validar activos y accesos |
| Posicionar la marca y generar leads | Secciones 1, 4.3, 6 y 10: experiencia, conversión y medición | Cubierto |
| Proponer plataforma | Sección 5: WordPress como recomendación preliminar sujeta a auditoría | Cubierto con validación pendiente |
| Desarrollar contenidos | Sección 5.3: arquitectura, copy y validación de claims | Cubierto |
| Trabajar SEO | Sección 6: fundamentos y operación mensual opcional | Cubierto |
| Trabajar posicionamiento en motores de IA | Sección 6: AEO, entidad, claridad, citabilidad y medición | Cubierto sin promesa de citaciones |
| Medir conversiones | Secciones 4.3 y 10: eventos, fuentes, funnel y reporte | Cubierto |
| Usar correo como contacto inicial | Sección 4.3: correo/formulario y seguimiento | Cubierto |
| Permitir evolución hacia venta de equipos móviles | Secciones 4.1, 5.1 y 12: arquitectura extensible, comercio como fase posterior | Cubierto como evolución |
| Proponer redes sociales mensuales | Sección 7: estrategia y operación opcional | Cubierto; cantidades por definir |
| Considerar versión bilingüe | Secciones 1, 12 y 13: alternativa español–inglés | Cubierto como opción |
| Priorizar servicios y sectores definidos | Secciones 3 y 4.2: jerarquía explícita | Cubierto |
| Operación inicial independiente en Chile | Secciones 2, 4.1 y 5.1: autonomía local con continuidad regional | Cubierto; validar arquitectura técnica |

---

## 16. Cierre y siguiente paso

Brightcell Chile no necesita comenzar con una plataforma sobredimensionada. Necesita una primera experiencia
comercial que explique bien su valor, genere conversaciones medibles y pueda crecer cuando el negocio tenga
claridad sobre catálogo, demanda, idiomas e integraciones.

Efeonce propone acompañar ese primer paso con un solo sistema de trabajo: estrategia, contenido, diseño,
desarrollo, SEO/AEO, redes sociales, medición y una capa de trazabilidad comercial.

El siguiente paso recomendado es validar conjuntamente:

1. capacidades y claims disponibles para Chile;
2. arquitectura y contenidos de la primera versión;
3. plataforma y relación con el sitio regional;
4. responsable y correo de recepción de leads;
5. alcance de HubSpot y su tratamiento económico;
6. calendario de lanzamiento;
7. alternativa bilingüe y operación mensual.

Con esas definiciones, Efeonce podrá congelar la versión final de la propuesta técnica, emitir la propuesta
económica coherente con el alcance y componer ambos documentos mediante Artifact Composer.

---

## Estado del documento

Esta oferta técnica es un borrador de trabajo client-facing. Antes de marcarla como lista para presentar
deben cerrarse la fecha de lanzamiento, el stack definitivo, las capacidades locales, los claims aprobados,
el equipo asignado, el alcance cuantitativo y las condiciones de la propuesta económica.
