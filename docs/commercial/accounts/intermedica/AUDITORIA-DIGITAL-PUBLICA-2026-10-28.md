# Intermedica Perú — auditoría digital pública y recorridos de campaña

**Corte:** 28-10-2026, America/Santiago. **Uso:** interno, insumo de propuesta para Claude Design. **Alcance:** sitio público, catálogo, diez fichas, rutas de contacto, contenido y anuncios accesibles. Sin analítica ni cuentas publicitarias del cliente; sin formularios enviados, campañas lanzadas o pruebas de venta. Esta auditoría amplía la [investigación pública](INVESTIGACION-PUBLICA-2026-10-28.md); no repite la conciliación de historial o CRM.

## Lectura que orienta la propuesta

**La base comercial publicada permite mejorar recorridos concretos antes de plantear una reconstrucción integral.** Hay catálogo por especialidad, fichas identificables, preselección de equipo al pasar a Contacto, showroom y una promesa de formación/posventa. La oportunidad propuesta es conectar esos activos con consultas profesionales bien clasificadas, demostraciones y seguimiento comercial verificable.

Se reprodujeron **dos enlaces 404** desde el sitio. También se detectaron destinos de WhatsApp incompletos o de ejemplo en el HTML de Contacto. Conviene resolverlos antes de comprar más tráfico hacia esos recorridos. **No se midió pérdida de consultas, conversión, tráfico, CPL, ROAS ni ventas**; las mejoras siguientes son prioridades de trabajo, no pronósticos de retorno.

## Método y grado de certeza

Se aplicaron Research & Benchmark, Digital Marketing y el módulo CRO. El harness `deep-research` no estaba disponible como herramienta ejecutable en esta sesión: se realizó una inspección manual acotada con lectura web, GET HTTP mediante Python/curl y revisión de HTML/JavaScript público. Dos métodos sobre una misma web reproducen un hecho técnico; no constituyen dos fuentes empresariales independientes.

- **Alta de observación:** respuesta HTTP, destino de enlace o contenido público reproducido. Acredita lo observado al corte.
- **Media de interpretación:** inferencia razonable sobre claridad, clasificación o esfuerzo, pendiente de usuarios y datos.
- **Hipótesis:** efecto sobre calidad, conversión o negocio; requiere línea base y validación.

No se operó un navegador ni se realizó QA visual móvil/escritorio. Un timeout del lector web no se clasificó como caída: las páginas accesibles por GET HTTP se registraron como tales. No se enviaron POST al endpoint del formulario ni se abrió una conversación de WhatsApp. No se ejecutó Lighthouse, CrUX, rastreo completo, pruebas de accesibilidad ni auditoría de cookies; no hay score de UX o velocidad.

## Activos que conviene conservar

| Activo observado | Para qué sirve en la propuesta | Evidencia y límite |
| --- | --- | --- |
| Organización por dermatoestética, fisioterapia/rehabilitación, nutrición y fillers; filtros por línea y representación | Facilita campañas y páginas por una necesidad profesional concreta | [Catálogo](https://www.intermedica.pe/equipos/) y filtro de [rehabilitación](https://www.intermedica.pe/equipos/?lineas=fisioterapia-y-rehabilitacion), HTTP 200. No prueba facilidad de uso visual ni éxito del buscador |
| Fichas con imágenes, especificaciones y enlaces que llevan el identificador del equipo a Contacto | Conserva contexto de producto y permite una mejora gradual | Las diez fichas de la muestra devolvieron HTTP 200. En Body Tite, el HTML/JS de destino contiene la preselección por `body-tite-709`; no se probó envío |
| Showroom, servicio técnico y horario publicados | Puede reducir dudas de compra, instalación y soporte | [Contacto](https://www.intermedica.pe/contacto/) y [Nosotros](https://www.intermedica.pe/nosotros/). Disponibilidad y compromisos reales deben ratificarse con el cliente |
| Marcas y representación técnica como parte del relato | Da un punto de partida para evidencia profesional y selección de tecnología | [Representaciones](https://www.intermedica.pe/representaciones/). Es declaración del distribuidor; no certifica exclusividad, permisos de uso de marca o cada claim clínico |
| Formación clínica y posventa dentro de la propuesta institucional | Permite defender valor más allá de entregar un equipo | [Nosotros](https://www.intermedica.pe/nosotros/) y [LinkedIn corporativo](https://pe.linkedin.com/company/intermedica-solutions-peru). La certificación de ingenieros es una declaración empresarial, sin auditoría independiente en esta corrida |

## Evidencia de fallas y fricciones

### 1. Dos destinos públicos devuelven 404

| Recorrido | Evidencia reproducida el 28-10-2026 | Qué hacer y qué no inferir |
| --- | --- | --- |
| Portada → Academy, enlace «Conoce más aquí» | El HTML de [inicio](https://www.intermedica.pe/) apunta a [page_id=70](https://www.intermedica.pe/?page_id=70). Lector web: 404; Python GET: 404; `curl -sSL -o /dev/null -w '%{http_code}'`: 404 | Restaurar la página o cambiar el enlace hacia una agenda vigente. No afirmar que Academy no existe: hay actividad pública de formación fuera de esa ruta |
| Footer → Términos y Condiciones | El footer de inicio/contacto apunta a [page_id=97](https://www.intermedica.pe/?page_id=97). Lector web, Python GET y curl: 404 | Cliente debe indicar la versión válida y su responsable. Este hallazgo es de navegación; no es un dictamen de cumplimiento |

### 2. WhatsApp requiere saneamiento de destinos

En [Contacto](https://www.intermedica.pe/contacto/), seis enlaces de tarjetas de asesores contienen `phone=999999999`; el enlace global contiene `phone=973359831`. Se contrastó el HTML con el JavaScript inline y [main.js público](https://www.intermedica.pe/wp-content/themes/wp-intermedica/static/js/main.js?ver=1.0): las pestañas cambian con el tipo de consulta y no se encontró allí sustitución de esos teléfonos.

**Hecho comprobado:** esos son los destinos entregados en la respuesta HTTP. **Interpretación:** el primero aparenta ser un dato de ejemplo y el segundo omite el prefijo internacional peruano que sí acompaña al número mostrado en el footer. La [guía oficial de WhatsApp](https://faq.whatsapp.com/5913398998672934) prescribe un número completo en formato internacional. **Pendiente:** validar números y titulares con el cliente y comprobar el destino en dispositivos; no se afirma conversación fallida ni visibilidad efectiva de cada tarjeta en todas las vistas. No reutilizar los nombres de asesores como buying group sin confirmar su vigencia.

### 3. La intención científica se deriva al tipo de consulta de compra

En las diez fichas, el CTA científico enlaza a `contacto/?consulta=adquisicion-de-equipo&equipo=…`; el CTA de información general lleva `contacto/?equipo=…`. En el primer caso Body Tite, el destino entrega código para seleccionar adquisición y equipo. Esto confirma una **clasificación implementada**, no un formulario roto.

Hipótesis: una solicitud de evidencia clínica puede necesitar una respuesta distinta a la cotización. Proponer rutas explícitas: documentación técnica, evaluación/demostración de equipo y búsqueda de un centro. No sumar automáticamente las tres como leads de compra.

### 4. Medición pública: resultado inconcluso, no ausencia

La extracción web de [SP Spectro](https://www.intermedica.pe/equipos/sp-spectro/) mostró un iframe de Google Tag Manager; el documento del lector indicaba rastreo previo. En cambio, los GET directos actuales de inicio, Contacto, Body Tite y SP Spectro no incluyeron cadenas `googletagmanager`, `GTM-`, `gtag(` o `fbq(`. La diferencia puede deberse a versión, caché o condiciones de entrega; esta inspección no la resuelve.

Por tanto, **no se confirma ni descarta instalación vigente de GA4/píxeles, consentimiento, conversiones o CRM**. La revisión con acceso autorizado debe inventariar contenedores, etiquetas y recepción real. Ver un contenedor nunca acredita que se mida una consulta correctamente.

## Muestra del catálogo: diez fichas, cuatro líneas

Las diez devolvieron HTTP 200 por GET directo. Comparten tres acciones: información científica, información comercial y localizador de centros. Esta tabla evalúa el contenido publicado; no valida eficacia clínica, certificaciones ni stock.

| Ficha observada | Contenido útil que ya ofrece | Mejora propuesta para decisión B2B |
| --- | --- | --- |
| [Body Tite](https://www.intermedica.pe/equipos/body-tite/) | Explicación del mecanismo y control de temperatura | Aclarar para qué profesional y tipo de centro se evalúa; guía de instalación, capacitación y demostración. Revisar con experto el alcance del título sobre cicatrices frente a la descripción de una incisión; no emitir juicio clínico desde marketing |
| [SP Spectro](https://www.intermedica.pe/equipos/sp-spectro/) | Variedad de aplicaciones presentada por la marca | Organizar la evaluación por especialidad y necesidad; publicar fuente aprobada y acceso a asesor técnico en vez de una lista indiferenciada |
| [Hydrafacial](https://www.intermedica.pe/equipos/hydrafacialperu/) | Descripción de la pieza de mano y consumibles | Distinguir incorporación de la tecnología al centro de búsqueda de tratamiento; ficha de operación/soporte y CTA profesional |
| [EMPOWER RF](https://www.intermedica.pe/equipos/empower-rf/) | Identifica modalidades tecnológicas | Describir evaluación profesional, formación y requisitos aplicables; evitar que el formulario comercial solicite datos de pacientes |
| [Starformer IntimaWave](https://www.intermedica.pe/equipos/starformer-intimawave/) | Presenta tecnología y campo de aplicación | Ampliar evidencia aprobada y criterios de selección; CTA de consulta técnica con especialista, separado del localizador |
| [HIRO TT](https://www.intermedica.pe/equipos/hiro-tt/) | Tipo de láser y componentes de la solución | Añadir condiciones de implementación, formación y demostración; aprobar cada afirmación terapéutica antes de adaptarla a anuncios |
| [EnPuls 2.0](https://www.intermedica.pe/equipos/enpuls-2-0/) | Portabilidad, operación y referencia a mantenimiento | Convertir esas características en preguntas de evaluación del centro; no copiar promesas comparativas sin fuente y alcance validados |
| [InBody 270S](https://www.intermedica.pe/equipos/inbody-270s/) | Frecuencias, conectividad, formatos de informe y memoria | Guía de encaje por uso profesional, comparación aprobada con otros modelos y demostración del flujo de trabajo |
| [InBody 580](https://www.intermedica.pe/equipos/inbody-580/) | Modos de uso, interfaz y conectividad | Explicar diferencias verificadas frente al 270S y el soporte incluido; separar compra de equipo de una consulta de medición corporal |
| [Stylage LIPS Plus](https://www.intermedica.pe/equipos/stylage-lips-plus/) | Identidad del producto y uso descrito | Ruta de información para profesional habilitado, disponibilidad y acompañamiento; no convertir consultas de pacientes en demanda de insumos |

**Patrón editorial de la muestra:** conviven información técnica, mensajes sobre tratamientos y el localizador de centros. La coexistencia puede ser útil si se explicita quién visita y qué acción quiere realizar. No demuestra por sí sola confusión o baja conversión. No se recomienda eliminar el localizador: se propone medirlo y derivarlo por separado.

## Captura, contacto y confianza

La página de Contacto ofrece canales diferenciados y un formulario con nombre, apellido, correo, celular, tipo de consulta, selector condicional de equipo, comentario y aceptación de privacidad. El código público prevé un POST a Contact Form 7 y redirección cuando recibe `mail_sent`. **Eso prueba implementación publicada, no entrega al asesor ni creación de oportunidad.**

Se propone conservar equipo/intención de origen y añadir sólo los datos utilizados para atender: institución o consultorio, rol profesional y localidad, con campos progresivos si corresponden. La longitud óptima no puede decidirse sin observar consultas reales. No pedir datos clínicos personales para cotizar equipamiento.

Para la confianza, la prioridad es hacer verificable lo que ya se promete: quién instala, qué formación se incluye, cómo se solicita soporte, qué cobertura y condiciones tienen la garantía y el SLA, y qué profesional valida los documentos. La web menciona estos activos, pero la oferta de campaña debe reflejar condiciones confirmadas; no inventar testimonios, cifras de base instalada, disponibilidad o financiaciones.

La dirección del sitio y la de LinkedIn corporativo siguen siendo distintas. Validar sede vigente antes de reutilizar direcciones en anuncios, invitaciones y propuestas. No inferir que una de ellas sea falsa o que hubo una mudanza reciente.

## Contenidos y campañas actuales: cobertura real

Se verificó en [LinkedIn corporativo](https://pe.linkedin.com/company/intermedica-solutions-peru) una invitación a Entrenamiento Clínico Avanzado Fotona 2026, presentada con antigüedad relativa de tres semanas y enlace de inscripción. Sirve como prueba de comunicación educativa; no se acreditó fecha exacta del evento, cupos vigentes, asistencia o resultados. Antes de promoverla se debe confirmar agenda, disponibilidad y responsable.

La portada/fichas aportan fotografía de equipo, descripciones técnicas, explicación de aplicaciones y un video institucional enlazado desde Nosotros. Son materias primas para contenidos de evaluación: comparativas aprobadas, preguntas frecuentes de compra, demostración operativa, formación y posventa. No se auditó el contenido íntegro del video ni todas las publicaciones sociales.

Se intentó la [Biblioteca de anuncios de Meta](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PE&q=Intermedica&search_type=keyword_unordered): el lector fue limitado por el proveedor. [Instagram](https://www.instagram.com/intermedica.solutions/) no pudo recuperarse y [Facebook](https://www.facebook.com/IntermedicaSolutions) mostró un bloqueo temporal. El [Centro de Transparencia de Google](https://adstransparency.google.com/) sólo entregó su estructura inicial, sin un anunciante o anuncios atribuibles a la empresa. Las búsquedas indexadas acotadas no resolvieron esa falta.

**Estado: anuncios activos y campañas pagadas actuales no verificados.** No reportar cero anuncios ni inferir canales, inversión, audiencia o proveedor. Pedir al cliente inventario/export de campañas y lectura de cuentas para cerrar esta parte del diagnóstico.

## Backlog priorizado para dimensionar alcance

Prioridad por criticidad observada y dependencia, no por tráfico desconocido. Esfuerzo **S** = ajuste acotado; **M** = contenido/configuración coordinada; **L** = integración o trabajo de varios roles. Son estimaciones relativas, no compromisos de plazo ni precio. El orden debe revisarse al recibir analítica.

| Prioridad | Acción | Evidencia / certeza | Esfuerzo | Métrica y prueba de salida | Responsable / siguiente paso |
| --- | --- | --- | --- | --- | --- |
| P0 | Corregir destinos Academy y Términos | Dos 404 reproducidos; alta de observación | S–M | Ambos enlaces llevan a contenido vigente HTTP 200; revisión de CTA y móvil | Web + dueño del contenido: definir destino y comprobar en navegador |
| P0 | Conciliar y normalizar destinos WhatsApp | Seis números de ejemplo y número sin prefijo en HTML; alta de observación, impacto no medido | S | Cada CTA abre el destinatario autorizado; después medir conversaciones recibidas, aparte de clics | Cliente confirma titulares; Web cambia y QA verifica sin enviar salvo prueba autorizada |
| P0 | Probar recepción y clasificación del formulario | Formulario y lógica publicados; entrega desconocida | M | Una prueba autorizada por intención llega al owner correcto, conserva equipo/fuente y deja evidencia | Marketing + Ventas + Web: acordar buzón/CRM y prueba identificada |
| P0 | Inventariar medición y fijar definiciones | Extracciones discrepantes; estado inconcluso | M–L | Eventos observados con fuente, deduplicación y concordancia con registros reales | Medición + cliente: accesos de lectura y export, sin doble instalación |
| P1 | Separar documentación, compra y búsqueda de centro | Destinos compartidos/prefill reproducidos; efecto es hipótesis | M | Calidad de consultas por intención; tasa de derivación correcta y motivo de descarte | Ventas + UX/copy: acordar clasificación y prototipo antes de publicar |
| P1 | Mejorar dos páginas prioritarias con prueba comercial | Muestra de fichas y activos de soporte; confianza media | M | Consulta profesional válida → demostración acordada → realizada, por línea | Cliente elige líneas por margen, stock y capacidad; expertos aprueban contenido |
| P1 | Recuperar Academy como recorrido trazable | Formación pública real + enlace web roto | M–L | Registro válido, asistencia y solicitud de demo identificados por separado | Formación + Ventas: agenda vigente, consentimiento y handoff |
| P2 | Matriz de decisión por modelo/especialidad | Especificaciones publicadas; utilidad por validar | M | Uso de comparación y consultas con contexto suficiente; feedback del asesor | Expertos de producto aportan diferencias verificables |
| P2 | Cohortes de formación/servicio para base instalada | Posventa declarada; base y permisos no revisados | L | Servicio/entrenamiento atendido y oportunidad separada de adquisición nueva | Cliente entrega cohortes y permisos; no disparar campañas desde esta investigación |

Sin tráfico/base suficiente no se propone un A/B estadístico como primer paso. Empezar por correcciones reproducidas y evaluación cualitativa; definir experimento, denominador, ventana y tamaño de muestra después.

## Tres recorridos propuestos de campaña

**Son opciones de diseño, no campañas existentes.** Seleccionar una o dos con el cliente; no repartir pauta automáticamente entre todas las líneas. Cada lanzamiento depende de stock, margen, capacidad de demo/soporte, calendario, evidencia aprobada y presupuesto de medios separado del fee.

### A. Evaluación de tecnología dermatoestética → demostración profesional

- **Entrada:** profesional o responsable de un centro comparando un equipo concreto. Seleccionar, por ejemplo, una tecnología de la cartera Fotona/Inmode sólo tras validar prioridad y representación.
- **Canal candidato:** Search por intención de marca/modelo y compra profesional; contenido educativo orgánico como apoyo. Disponibilidad de búsqueda, términos y volumen pendientes; no se estimaron keywords ni CPC.
- **Mensaje de trabajo:** ayudar a evaluar encaje, instalación, capacitación y soporte. Publicidad con beneficios y evidencia aprobados por el cliente; sin extrapolar resultados clínicos ni prometer rentabilidad.
- **Destino:** página del equipo mejorada o landing dedicada que mantenga continuidad con el anuncio: para quién es, criterios de evaluación, documentación autorizada, formación/soporte y siguiente paso. CTA principal propuesto: **«Coordinar una demostración del equipo»**; alternativa de menor compromiso: **«Solicitar documentación técnica»**.
- **Captura:** identidad/contacto, institución/rol, localidad, equipo e intención; nada clínico de pacientes. Confirmación con próximo paso y canal real. Consulta técnica entra en cola técnica; demo entra en comercial.
- **Handoff:** owner comercial por línea verifica cobertura, necesidad y horizonte; acuerda fecha, registra realizada/no realizada y motivo; especialista técnico participa cuando haga falta. SLA de primera respuesta acordado con el cliente, sin inventar un plazo público.
- **Medición:** clic y visita como diagnósticos; solicitud recibida válida, contacto efectivo, demo acordada, demo realizada y cotización son hechos separados. Indicador principal candidato: demos realizadas con encaje / solicitudes profesionales válidas, por cohorte. Valor de oportunidad sólo cuando Ventas lo sustente.
- **Condición de parada:** faltan disponibilidad/experto o consultas de pacientes dominan el recorrido; pausar el conjunto afectado y corregir mensaje/derivación antes de ampliar inversión.

### B. Academy → aprendizaje → conversación sobre una tecnología

- **Entrada:** profesional interesado en formación, todavía sin decisión de compra. Partir de un evento realmente programado, no del nombre «Fotona 2026» sin fecha confirmada.
- **Canal candidato:** LinkedIn, redes propias y comunicaciones a una base con permisos revisados; patrocinio sólo con presupuesto y audiencia aprobados. El registro del evento no equivale a consentimiento universal para nurturing.
- **Contenido/destino:** agenda vigente en Academy, objetivos de aprendizaje, docente acreditado por el cliente, modalidad, fecha, requisitos y condiciones. CTA de entrada: **«Ver programa e inscripción»**. Contenido posterior: resumen técnico aprobado y opción **«Conversar sobre la aplicación en mi centro»**.
- **Captura:** separar inscripción confirmada, asistencia y pregunta de interés. Conectar formulario externo actual con el registro operativo mediante un identificador, sin presumir integración nativa o licencia CRM.
- **Handoff:** Formación conserva logística; Ventas recibe únicamente solicitudes comerciales explícitas o los criterios de seguimiento que se acuerden. Asistir no convierte automáticamente a la persona en oportunidad.
- **Medición:** registros válidos / visitas del programa; asistentes / inscritos confirmados; solicitudes de conversación / asistentes, con ventanas distintas. No sumar reproducción social y asistencia como la misma métrica.
- **Condición de parada:** evento sin fecha/cupos confirmados, captura no conciliable o ausencia de responsable. Conservar Academy como activo editorial hasta resolverlo.

### C. Selección de InBody para un servicio profesional → evaluación guiada

- **Entrada:** nutricionista, clínica o responsable de una unidad que evalúa incorporar o renovar análisis corporal; el cliente define qué segmentos puede atender. No confundir con personas que buscan una medición.
- **Canal candidato:** Search de producto/categoría con intención profesional, apoyo de contenido de uso y comparaciones; remarketing sólo si audiencia, consentimiento y configuración son válidos. No se asumió volumen ni viabilidad económica.
- **Contenido/destino:** guía comparativa 270S/580 con diferencias verificadas por experto, flujo de trabajo, formatos de informe, conectividad y soporte. No afirmar superioridad clínica o financiera a partir de especificaciones. CTA principal propuesto: **«Evaluar qué equipo encaja en mi servicio»**; secundario: **«Ver los criterios de comparación»**.
- **Captura:** tipo de institución, uso previsto, localidad y modelo de interés opcional; el asesor completa necesidad, capacidad y horizonte en conversación. La persona que busca una evaluación corporal se deriva al localizador de centros y se contabiliza fuera del pipeline de equipo.
- **Handoff:** asesor de nutrición contacta, valida caso de uso, organiza demostración o entrega comparación, y decide si corresponde cotizar. Si ya hay equipo, separar expansión/renovación de cliente nuevo.
- **Medición:** consultas profesionales recibidas y calificadas, evaluaciones realizadas y cotizaciones; indicador candidato: evaluaciones con siguiente paso acordado / evaluaciones realizadas. Precio, margen, ciclo y objetivos se establecen al recibir datos.
- **Condición de parada:** documentación insuficiente de modelos, demanda predominantemente de pacientes o soporte comercial sin capacidad; ajustar la propuesta antes de escalar.

## Contrato de medición para los tres recorridos

Definir primero el diccionario compartido: `consulta_recibida`, `consulta_profesional_valida`, `contacto_efectivo`, `demo_acordada`, `demo_realizada`, `cotizacion_emitida`, `oportunidad` y `venta`. Son nombres conceptuales propuestos; mapearlos al CRM existente, no crear schema por efecto del documento.

Registrar fuente/campaña, línea/equipo, intención, owner y estados con timestamps; preservar identificadores técnicos cuando existan y una fuente declarada por la persona. No enviar PII al sistema de analítica. Clic a WhatsApp es intención; sólo la recepción confirmada constituye conversación. Un `mail_sent` del plugin no demuestra atención comercial. La [referencia oficial GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/events) distingue generación, calificación y trabajo del lead; adaptar esos eventos al contrato real y no asignar valor monetario arbitrario a cada envío.

**Datos que cambian la decisión de inversión:** últimas campañas y destinos, resultados por intención/etapa, canales de entrada, margen y disponibilidad por línea, tasa de contacto y motivos de descarte, capacidad de demostraciones, calendario de Academy y operación de posventa. Con esos datos se eligen alcance y metas. Esta entrega no los sustituye con benchmarks de mercado.

## Handoff a propuesta y Claude Design

Narrativa sugerida: **«Convertir el interés por tecnología médica en decisiones profesionales acompañadas»**. Mostrar primero activos reales, después los dos recorridos rotos, luego la separación profesional/paciente y el sistema de demostración/seguimiento. Evitar una portada que prometa ventas, un diagnóstico de inactividad publicitaria o un supuesto rediseño total.

Usar una lámina de prioridades P0/P1/P2, una de alcance inicial por línea, una de responsabilidad Marketing–Formación–Ventas y una de medición desde consulta recibida hasta demo realizada. Los tres recorridos sirven para elegir el piloto y explicar entregables; no son un compromiso de ejecutar tres campañas simultáneas. Precios, inversión de medios y equipo se costean en el carril comercial, con Technogym separado de Intermedica.

**Verificación pendiente antes de versión cliente:** QA visual, validación de WhatsApp, prueba autorizada de recepción/CRM, inventario de medición y anuncios actuales, condiciones de soporte y aprobación de fuentes/claims por el experto del cliente. El siguiente owner es Commercial + responsable de marketing/ventas de Intermedica; Web/Medición dimensionan la ejecución.
