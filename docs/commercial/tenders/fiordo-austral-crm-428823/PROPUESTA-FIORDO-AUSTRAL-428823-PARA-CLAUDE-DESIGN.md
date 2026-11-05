# Propuesta Fiordo Austral — Implementación de plataforma CRM (Wherex 428823) — master para diseño

> **Qué es este archivo:** el texto maestro de la oferta técnica, organizado por bloques y listo para diseñar en /design con el design system «La órbita» (línea `revenue-hubspot`). Cada bloque trae **contenido presentable** y, aparte, una **nota de diseño** (▸) que no va en la pieza.
> **Estado:** borrador del 05/11/2026. **No está aprobado ni presentado.** El precio es preliminar y requiere la aprobación de Julio. Hay que volver a verificar el tier Gold y el waiver del onboarding de HubSpot antes de enviar.
> **Fuentes internas:** carpeta `research/` (comprador, encaje funcional, matriz de seguridad, método y precio, brief visual). El anexo para el comprador es `ANEXO-MATRIZ-CIBERSEGURIDAD-428823.md`.
> **Registro:** formal e institucional, de usted. Al cliente se le nombra como «Fiordo Austral».

---

## Ledger de la propuesta

| Tipo | Contenido |
| --- | --- |
| **Requisito de las bases** | CRM para unos 10 usuarios. Incluye licencias, implementación, migración desde Excel, integraciones, capacitación, puesta en marcha, estabilización y soporte. Requerimientos funcionales a–g. Ciberseguridad con matriz de cumplimiento como condición de adjudicación y prueba técnica previa a producción. Outlook obligatorio; QAD, Teams y SharePoint deseables. Contrato de 12 meses renovable. Demo para los mejor evaluados. |
| **Hecho investigado** | Negocio de subproductos del salmón (harina, aceite e hidrolizados), con 6 plantas y exportación: Asia 60 %, Europa 21 %, Norteamérica 11,5 % y Sudamérica 7,5 %. Ventas contra especificación por cliente (proteína y FFA) y certificados (MSC, ASC, Halal, Kosher, SMETA). Venta vía distribuidores y traders. Las capacidades HubSpot por edición vienen de knowledge.hubspot.com y legal.hubspot.com, consultados el 05/11/2026. |
| **Supuesto propio** | Arquitectura de datos, cronograma de 16 semanas, equipo, horas, SLA de soporte de Efeonce y alcance de la fase opcional QAD. |
| **Decisión pendiente** | Precio de lista y piso, moneda, waiver del onboarding de HubSpot, confirmación del tier Gold, personas del equipo, fechas y comisión en Wherex, sprocket 3D (no se usa hasta tener autorización) y licencias Microsoft que ya tenga el cliente. |

---

## Bloque 1 — Portada

**Implementación de plataforma CRM**
Smart CRM de HubSpot para el equipo comercial de Fiordo Austral

Propuesta técnica · Licitación Wherex N.º 428823 · Noviembre de 2026
Efeonce Group SpA · Certified HubSpot Solutions Partner

▸ Diseño: `cover-proposal` con layout `orbit-decision` y el logo de Fiordo Austral dentro de la órbita. La insignia oficial HubSpot Solutions Partner (Gold) va sin alterar, en la zona de firma. Tema oscuro. No usar el sprocket 3D.

---

## Bloque 2 — Carta de presentación

Señores
Subgerencia de Adquisiciones
Pesquera Fiordo Austral S.A.
Puerto Montt

De nuestra consideración:

Efeonce Group presenta su propuesta para la implementación de la plataforma CRM de Fiordo Austral. Proponemos **HubSpot Sales Hub Enterprise**, implementado, integrado con Microsoft 365 y asegurado por Efeonce como Certified HubSpot Solutions Partner.

Hemos preparado esta propuesta a partir de lo que hace distinta la venta de Fiordo Austral. Su equipo vende contra especificaciones técnicas de cada cliente, en cuatro regiones del mundo, a través de visitas a planta, ferias, muestras y distribuidores. Y lo hace hoy desde planillas Excel. El CRM que proponemos convierte ese conocimiento en un sistema: cada cliente con sus requisitos de proteína y FFA, sus certificados y su historia; cada oportunidad con su etapa, su aprobación y su próximo paso, visible desde el escritorio y desde el teléfono.

Sabemos también que la condición de adjudicación es la seguridad. Por eso la propuesta parte de Microsoft Entra ID: inicio de sesión único, MFA resistente al phishing, Acceso Condicional, registro hacia su SIEM Wazuh y respaldo bajo control de Fiordo Austral. Todo ello se demuestra en una prueba técnica antes de pasar a producción y se responde requisito por requisito en la matriz de cumplimiento adjunta.

Quedamos a su disposición para la demostración de la plataforma.

Atentamente,
Efeonce Group SpA

▸ Diseño: página editorial, sin imagen. Firma con el logo Efeonce centrado, sin la burbuja URL.

---

## Bloque 3 — Lo que entendimos

**Una venta técnica, global y en terreno**

Fiordo Austral no vende un commodity. Vende harina y aceite de salmón contra la especificación de cada cliente: proteína mínima, FFA máximo, humedad, certificaciones y documentos de calidad que cambian según el mercado y el comprador. La venta se construye en el tiempo: contacto, muestra, análisis, aprobación técnica, contrato y embarques sucesivos.

Lo que hoy vive en planillas:

- **Clientes y contactos dispersos** en archivos por vendedor, sin historial común de interacciones.
- **Especificaciones técnicas** que se buscan en correos y documentos cada vez que llega una cotización.
- **Oportunidades sin pipeline visible:** es difícil saber qué está abierto, qué se ganó, qué se perdió y por qué, por país y por vendedor.
- **Visitas y ferias** registradas tarde o nunca.
- **Clientes que se enfrían** sin que nadie lo advierta a tiempo.

Lo que pide la licitación:

- Una plataforma que centralice la gestión comercial.
- Un estándar de seguridad propio de una empresa con Microsoft Entra ID, Acceso Condicional y un SIEM operativo.

▸ Diseño: momento cinematográfico. Tres cifras grandes como objetos sobre la plataforma de luz: «4 regiones», «6 plantas», «10 usuarios». Sólo cifras públicas verificadas; no poner volúmenes de producción sin la fuente al pie.

---

## Bloque 4 — Nuestra propuesta en una frase

**Un solo CRM donde vive cada cliente, cada especificación y cada oportunidad, seguro desde la identidad Microsoft de Fiordo Austral.**

Tres compromisos:

1. **Su venta, modelada como es:**
   - especificaciones técnicas por cliente;
   - pipeline de exportación con aprobación interna;
   - segmentación por país, región y mercado;
   - distribuidores asociados a sus clientes finales.
2. **Integrado a su trabajo diario:** Outlook, calendario, Teams, SharePoint y Excel, con app móvil para visitas a planta y ferias.
3. **Seguro por diseño:**
   - Entra ID con SSO y MFA resistente al phishing;
   - Acceso Condicional;
   - auditoría hacia Wazuh;
   - ambientes separados;
   - respaldo probado y restauración documentada.

▸ Diseño: layout `proposal-cinematic` `hero`. Frase protagonista; los tres compromisos como órbitas o lentes.

---

## Bloque 5 — Por qué HubSpot Sales Hub Enterprise

Evaluamos las alternativas de referencia de las bases. Recomendamos **HubSpot Sales Hub Enterprise** porque combina una adopción alta en equipos comerciales con los controles que exige la sección 4 de las bases.

| Lo que exige Fiordo Austral | Lo que aporta Sales Hub Enterprise |
| --- | --- |
| Especificaciones técnicas por cliente (% proteína, % FFA) | Objetos personalizados: un registro de «Especificación técnica» por cliente y producto, asociado a la empresa y a la oportunidad. |
| Flujos de aprobación internos | Aprobaciones nativas en etapas del pipeline. |
| Ambientes separados de desarrollo, pruebas y producción | Sandbox estándar para probar cambios antes de producción. |
| Auditoría exportable hacia el SIEM | Registro de auditoría ampliado y API de auditoría de acciones de usuario. |
| Mínimo privilegio y roles personalizados | Conjuntos de permisos, equipos y jerarquías, y permisos por campo para datos sensibles. |
| Respaldo y recuperación | Respaldo automático diario y respaldos programados, restauración de cambios del CRM y papelera de 90 días. |
| SSO con Entra ID y MFA | SSO SAML con Microsoft Entra ID, SSO obligatorio, aprovisionamiento SCIM y 2FA obligatorio para accesos sin SSO. |

**Sales Hub Professional** cubre la gestión comercial básica, pero no incluye objetos personalizados, aprobaciones nativas, sandbox, conjuntos de permisos ni la API de auditoría. Por eso no cumpliría requisitos obligatorios de las bases.

▸ Diseño: tabla convertida en «dos columnas de luz». Usar los íconos oficiales de producto de HubSpot sólo según las guías de partner. Sin comparativa gráfica contra otros fabricantes.

---

## Bloque 6 — Así se verá su CRM

**Arquitectura de datos diseñada para la venta de Fiordo Austral**

- **Empresas:**
  - País, macro-región (Asia, Europa, Norteamérica, Sudamérica), mercado o uso (acuicultura, petfood, nutrición), tipo de cliente y estado.
  - El estado (prospecto, activo, inactivo) se actualiza automáticamente según la fecha del último negocio ganado.
- **Contactos:** rol en el cliente (compras, calidad, logística, gerencia) e idioma.
- **Distribuidores y traders:** asociados a sus clientes finales con etiquetas de asociación. Así se ve quién compra a través de quién.
- **Especificación técnica (objeto personalizado):**
  - Producto, % proteína mínima, % FFA máxima, humedad, ceniza, otras especificaciones, certificación requerida (por ejemplo MSC, ASC, Halal o Kosher), vigencia y estado.
  - Cada cliente puede tener varias especificaciones.
  - Cada oportunidad hereda la que corresponde.
- **Oportunidades:**
  - Producto o línea, toneladas, incoterm, puerto de destino, precio por tonelada, moneda, ventana de embarque y motivo de pérdida.
- **Pipeline «Negocios de exportación»:**
  - Contacto inicial → Requisitos y muestra → Oferta enviada → Negociación → Aprobación interna → Ganado o perdido.
- **Actividades:**
  - Correos sincronizados desde Outlook, reuniones y llamadas.
  - Reuniones tipificadas: visita a planta, feria, reunión remota y visita al cliente.

La arquitectura definitiva se valida con el equipo de Fiordo Austral en la fase de descubrimiento.

▸ Diseño: **momento «Su ficha técnica»**. Captura real de un registro de Especificación técnica en el portal demo de Efeonce, con datos ficticios marcados como de ejemplo. Alrededor, diagrama de objetos con la Empresa al centro. No redibujar la interfaz de HubSpot: usar la captura real.

---

## Bloque 7 — Los requerimientos funcionales, cubiertos

| Requerimiento de las bases | Cómo se resuelve |
| --- | --- |
| **a) Clientes y contactos** | Empresas y contactos con historial completo de correos, reuniones, llamadas y notas. Segmentación por país, región y mercado. Clasificación por tipo y estado. |
| **b) Gestión comercial** | Pipeline visual con etapas de negociación, recordatorios y tareas automáticas. Registro de llamadas, reuniones, correos y visitas. |
| **c) Especificaciones técnicas** | Objeto personalizado «Especificación técnica», con campos y validaciones propias. |
| **d) Gestión documental** | Contratos, especificaciones, certificados y correos adjuntos a empresas y oportunidades. Repositorio con versiones en SharePoint u OneDrive, vinculado al registro. |
| **e) Reportes y gestión** | Dashboards de actividad por vendedor, clientes activos e inactivos, resultados por país, y oportunidades abiertas, ganadas y perdidas. Exportación a Excel. |
| **f) Aplicación móvil** | App HubSpot para iOS y Android: registro de visitas, tareas y recordatorios, notificaciones y escáner de tarjetas de presentación para ferias. |
| **g) Automatizaciones** | Alerta de cliente sin contacto en el plazo que se defina, recordatorios de reuniones y tareas, tareas posteriores a cada reunión, aprobaciones internas, correos de seguimiento, alertas de cierre próximo y dashboards automáticos. |

▸ Diseño: siete tarjetas (a–g) en un sistema de lentes o órbita, no una tabla plana. Para que la pieza se lea sin presentador, se puede incluir una tabla compacta.

---

## Bloque 8 — En terreno

**La planta, la feria y el cliente, registrados en el momento**

Los vendedores de Fiordo Austral pasan tiempo en plantas, ferias y visitas. Con la app móvil de HubSpot:

- registran la visita y sus notas al salir de la reunión;
- escanean las tarjetas de presentación de una feria y crean los contactos;
- reciben los recordatorios de seguimiento en el teléfono;
- consultan la especificación del cliente antes de entrar a la reunión.

Las mismas políticas de seguridad de Entra ID aplican en el dispositivo móvil.

▸ Diseño: plate fotográfico opcional, con dirección de arte Efeonce (una feria o un puerto, sin personas identificables de Fiordo Austral). Si no hay plate, usar una composición con captura real de la app.

---

## Bloque 9 — Integrado a Microsoft 365

**HubSpot al centro del ecosistema que Fiordo Austral ya usa**

| Integración | Alcance | Carácter según las bases |
| --- | --- | --- |
| Microsoft Outlook | Correo conectado y complemento de Office 365. Los correos enviados y recibidos con clientes quedan en la línea de tiempo del registro. | Obligatoria |
| Calendario y reuniones | Sincronización del calendario de Outlook con las reuniones del CRM. | Obligatoria |
| Excel | Importación con plantillas y deduplicación. Exportación de vistas y reportes. | Obligatoria |
| Microsoft Teams | Notificaciones de automatizaciones, tareas y actividad del CRM en Teams. | Deseable |
| SharePoint u OneDrive | Carpeta documental por cliente, vinculada al registro. | Deseable |
| Contactos Outlook ↔ CRM | Sincronización controlada; se habilita primero como piloto para evitar duplicados. | Deseable |
| ERP QAD | Factibilidad y diseño incluidos. Construcción como fase opcional cotizada aparte (ver Bloque 16). | Deseable |

Toda integración usa permisos mínimos, credenciales no compartidas, registro de actividad y revocación, como piden las bases.

▸ Diseño: **momento «Arquitectura de integraciones»**. HubSpot al centro de la órbita. Alrededor, Outlook, Teams, SharePoint, Excel, QAD (línea punteada, porque es opcional), y en el anillo exterior de seguridad Entra ID y Wazuh. Usar logos oficiales de terceros sólo con sus reglas de uso.

---

## Bloque 10 — Seguridad por diseño

**Zero Trust desde la identidad: verificar cada acceso, conceder lo mínimo, asumir compromiso**

La seguridad de la solución se construye en capas, con responsabilidades claras:

- **HubSpot** opera la plataforma SaaS:
  - Infraestructura en AWS, replicación y continuidad.
  - Cifrado en tránsito con TLS 1.2 o superior y cifrado en reposo.
  - SOC 2 Type II, pruebas de penetración anuales independientes, bug bounty y gestión de incidentes.
- **Efeonce** configura, integra y evidencia:
  - SSO con Entra ID, roles con mínimo privilegio y conjuntos de permisos.
  - Restricción de exportaciones.
  - Colector de auditoría hacia Wazuh.
  - Respaldo programado hacia almacenamiento inmutable en el tenant de Fiordo Austral.
  - Pruebas de restauración y soporte con respuesta a incidentes.
- **Fiordo Austral** administra su tenant Microsoft: Entra ID, Acceso Condicional, MFA resistente al phishing, licencias y su SIEM Wazuh.

**La cadena de acceso:**
Usuario → Entra ID (MFA resistente al phishing y Acceso Condicional) → SSO SAML → HubSpot (permisos mínimos) → Auditoría → Wazuh

**Donde HubSpot no lo trae de forma nativa, Efeonce lo construye, y lo declaramos con transparencia:**

- **Sesión única por usuario.** HubSpot no ofrece un límite nativo de sesiones concurrentes. Se implementa como control compensatorio:
  - control de sesión de Acceso Condicional en Entra ID;
  - tiempos de expiración cortos;
  - cierre remoto de sesiones;
  - detección de sesiones simultáneas en Wazuh.
- **Integración con Wazuh.** No existe un conector nativo. Efeonce construye un colector sobre la API de auditoría de HubSpot, con decodificadores y reglas para Wazuh.
- **Respaldo inmutable.** El respaldo diario de Enterprise se complementa con una exportación programada a almacenamiento inmutable bajo control de Fiordo Austral, con restauración de prueba trimestral.

Cada requisito de la sección 4 se responde en el **Anexo — Matriz de cumplimiento de ciberseguridad**, con estado, licencia, configuración, costo, plazo, limitaciones, responsable y evidencia.

▸ Diseño: **momento «Cadena Zero Trust»**. La cadena de acceso como una trayectoria orbital con cinco nodos. Debajo, el resumen de la matriz con chips por estado, según el anexo del 05/11/2026: 74 requisitos, de los cuales 41 cumplen, 24 cumplen parcialmente, 7 requieren desarrollo y 2 no cumplen (RTO/RPO y ventanas de mantenimiento, que HubSpot no publica). Los 2 «no cumple» se presentan con su mitigación: pedir a HubSpot una declaración escrita. Las tres capas de responsabilidad como anillos concéntricos.

---

## Bloque 11 — Metodología y cronograma

**16 semanas de la planilla al CRM estabilizado**

| Fase | Semanas | Qué se hace | Entregable de aceptación |
| --- | --- | --- | --- |
| **F0 Descubrimiento y diseño** | 1–2 | Entrevistas con Comercial, Adquisiciones, TI y Gerencia. Inventario de los Excel. Mapa del proceso comercial. Roles y permisos. Revisión del entorno Microsoft. | Documento de arquitectura, mapa de integraciones, plan de migración y plan de pruebas, firmados. |
| **F1 Seguridad e identidad** | 2–4 | SSO con Entra ID, MFA y Acceso Condicional. Mínimo privilegio. Política de sesiones. Revisión de OAuth. Colector hacia Wazuh. Respaldo inmutable. Restricción de exportaciones. | Matriz de cumplimiento actualizada, evidencias de configuración, colector probado y restauración de prueba documentada. |
| **F2 Configuración del CRM** | 3–6 | Objetos y propiedades, incluida la especificación técnica. Pipeline y aprobaciones. Repositorio documental. Automatizaciones. Dashboards. App móvil. | Portal configurado en sandbox, catálogo de automatizaciones y dashboards publicados. |
| **F3 Migración desde Excel** | 5–6 | Limpieza, deduplicación y normalización. Carga de prueba, validación con el negocio y carga final. | Informe de migración con registros de origen y destino, rechazos y muestra validada. |
| **F4 Integraciones** | 6–8 | Outlook, calendario, contactos, Teams, SharePoint u OneDrive y Excel. Factibilidad de QAD. | Integraciones operativas e informe de factibilidad de QAD. |
| **F5 Pruebas y prueba técnica de seguridad** | 9–10 | Pruebas funcionales por caso de uso. Prueba técnica previa a producción: SSO, MFA, Acceso Condicional, logs en Wazuh, roles, cifrado, respaldo con restauración y respuesta a incidentes. | Acta de aceptación funcional y acta de la prueba técnica de seguridad. |
| **F6 Capacitación y puesta en marcha** | 11–12 | Capacitación de los 10 usuarios y de los administradores. Paso a producción con plan de reversa. | Material y grabaciones, registro de asistencia, guía de administración y acta de paso a producción. |
| **F7 Estabilización** | 13–16 | Acompañamiento cercano, ajustes, adopción semanal y calidad de datos. | Informe de cierre de estabilización y backlog de mejoras priorizado. |
| **Soporte y operación** | Meses 5 a 12 | Soporte con SLA, mantenimiento preventivo e indicadores mensuales. | Informe mensual y revisión trimestral. |

**Ambientes.** Desarrollo y pruebas en el sandbox de HubSpot Enterprise; producción en el portal de Fiordo Austral. Ningún cambio llega a producción sin pasar por pruebas.

▸ Diseño: **momento «Cronograma»**. Trayectoria orbital con las 8 fases como hitos, y la prueba técnica de seguridad (F5) destacada como la puerta a producción. Ritmo `proposal-cinematic` `lines`.

---

## Bloque 12 — Migración desde Excel

Los datos de Fiordo Austral se migran sin perder historia y sin heredar duplicados:

1. Inventario de planillas y responsables.
2. Limpieza, deduplicación y normalización de país, región y mercado.
3. Mapeo a las propiedades del CRM.
4. Carga de prueba en sandbox y validación con el equipo comercial.
5. Carga final en producción.
6. Informe con registros de origen y de destino, rechazos y duplicados resueltos.

---

## Bloque 13 — Capacitación

- **Usuarios (10):** gestión diaria del pipeline, registro de actividades, Outlook, app móvil, especificaciones y reportes. Sesiones en vivo y grabadas.
- **Administradores:** usuarios y permisos, propiedades, automatizaciones, reportes, monitoreo de integraciones y respaldo.
- **Material:** guía de usuario, guía de administración y grabaciones en español.
- **Adopción:** seguimiento semanal durante la estabilización, con indicadores de uso.

---

## Bloque 14 — Soporte y niveles de servicio

**Cobertura:** lunes a viernes de 9:00 a 18:30, hora de Chile, salvo festivos. Para eventos críticos de seguridad o caída total hay un canal de guardia permanente por teléfono y Microsoft Teams.

| Severidad | Ejemplo | Primera respuesta | Resolución o solución provisoria |
| --- | --- | --- | --- |
| **S1 Crítico** | CRM inaccesible para todos, incidente de seguridad o sospecha de fuga, pérdida de datos | ≤ 1 hora (guardia permanente para seguridad) | Contención en ≤ 4 horas y solución provisoria en ≤ 8 horas, o escalamiento a HubSpot o Microsoft con seguimiento cada 2 horas. Informe de causa raíz en ≤ 5 días hábiles. |
| **S2 Alto** | Función clave degradada: Outlook sin sincronizar, automatización crítica caída o registros sin llegar a Wazuh | ≤ 4 horas hábiles | ≤ 2 días hábiles |
| **S3 Medio** | Error de un reporte o automatización no crítica; problema de un usuario | ≤ 1 día hábil | ≤ 5 días hábiles |
| **S4 Bajo** | Consulta, cambio menor o mejora | ≤ 2 días hábiles | Planificado en el backlog mensual |

- **Escalamiento:**
  - N1: implementador asignado.
  - N2: consultor líder y especialistas de integraciones y seguridad.
  - N3: dirección de la práctica RevOps & CRM, con soporte de HubSpot por el canal partner y de Microsoft.
  - Ejecutivo: gerencia de Efeonce.
- **Mantenimiento preventivo mensual:**
  - Revisión de usuarios, roles y permisos.
  - Revisión de la auditoría y de su entrega a Wazuh.
  - Salud de las integraciones.
  - Verificación del respaldo, con restauración de muestra trimestral.
  - Calidad de datos.
  - Aplicación de las actualizaciones y novedades de seguridad que publique HubSpot.
- **Comunicación de incidentes:** S1 y S2 se notifican al abrirse por correo y Teams, se actualizan periódicamente y se cierran con un informe.
- **Indicadores mensuales:**
  - Tickets por severidad y cumplimiento de SLA.
  - Tiempos medios de respuesta y de resolución.
  - Adopción y calidad de datos.
  - Estado de integraciones y del envío de registros.
  - Cambios aplicados.
- **Revisión trimestral** con las áreas Comercial y TI.

La disponibilidad de la plataforma SaaS, su redundancia y su recuperación ante desastres son responsabilidad de HubSpot, según sus términos de servicio. Efeonce responde por la configuración, las integraciones y el soporte.

---

## Bloque 15 — Equipo

| Rol | Seniority | Responsabilidad |
| --- | --- | --- |
| Consultor líder HubSpot y arquitecto de solución | Senior | Diseño, decisiones de arquitectura, aceptación y capacitación de administradores. |
| Implementador HubSpot | Senior | Configuración, automatizaciones, migración y capacitación de usuarios. |
| Desarrollador de integraciones y API | Semi-senior / senior | Outlook, Teams, SharePoint, colector Wazuh, respaldo y factibilidad de QAD. |
| Especialista en seguridad e identidad (Entra ID y SIEM) | Senior | SSO, Acceso Condicional, OAuth, Zero Trust y evidencias. |
| Analista de datos | Semi-senior | Limpieza, validación y migración. |
| Project manager | Semi-senior | Plan, riesgos, actas e informes. |

▸ Nota interna: van roles sin nombres. Las personas y su capacidad están pendientes de confirmar.

---

## Bloque 16 — Por qué Efeonce

- **Certified HubSpot Solutions Partner, tier Gold.** Implementamos HubSpot para que el equipo lo use, no sólo para dejarlo encendido.
- **Negocio registrado en conjunto con HubSpot.** El equipo partner de HubSpot acompaña esta oportunidad.
- **Microsoft AI Cloud Partner Program, partner verificado y revendedor CSP.** Podemos gestionar las licencias Microsoft que la solución requiera.
- **Experiencia propia con Microsoft Entra ID.** Nuestra plataforma operativa usa inicio de sesión único y aprovisionamiento SCIM con Entra ID, Microsoft Graph y Microsoft Teams en producción.
- **Operamos nuestro propio comercial sobre HubSpot.** En la demostración verán un portal real en uso.
- **Equipo propio en Chile**, en idioma español, con soporte en horario local.

▸ Nota interna: los casos de clientes sólo van anonimizados («reestructuración CRM en una inmobiliaria del Cono Sur», con Marketing Hub Professional y 35 asientos de Sales), salvo autorización de nombre. No usar cifras como «100+ implementaciones», ni tasas de cierre, ni el caso Berel. Volver a verificar el tier Gold antes de enviar.

---

## Bloque 17 — Inversión (resumen)

| Componente | Detalle | Valor |
| --- | --- | --- |
| Licencias HubSpot Sales Hub Enterprise | 10 asientos, contratación anual directa con HubSpot a precio de lista vigente | USD 1.500 mensuales (USD 18.000 anuales) |
| Onboarding obligatorio de HubSpot | No aplica cuando la implementación la realiza un partner certificado | USD 0 *(sujeto a confirmación de HubSpot)* |
| Implementación Efeonce | Fases F0 a F7: descubrimiento, seguridad, configuración, migración, integraciones, pruebas, puesta en marcha y estabilización | USD 33.800 + IVA *(preliminar)* |
| Capacitación | Usuarios y administradores, material y grabaciones | USD 3.300 + IVA *(preliminar)* |
| Soporte y operación | Meses 5 a 12, con el SLA del Bloque 14 | USD 1.350 + IVA mensuales × 8 = USD 10.800 + IVA *(preliminar)* |
| **Total servicios Efeonce, año 1** | | **USD 47.900 + IVA** *(preliminar)* |
| Opcional: integración con ERP QAD | Construcción después de la factibilidad (F4), según la versión y la API de QAD | Entre USD 4.700 y USD 9.500 + IVA, a cotizar |
| Licencias Microsoft | Según las licencias que Fiordo Austral ya tenga (por ejemplo Entra ID P1/P2 o Defender for Cloud Apps para el control de sesión) | A confirmar |

El detalle está en la oferta económica.

▸ Nota interna: **NO PRESENTAR** sin aprobación de Julio sobre la lista, el piso (USD 39.150), la moneda, el recargo On-Demand y los meses de soporte. Confirmar con la PDM el waiver del onboarding y el precio de lista para este negocio. Se emite con la plantilla A4 de cotización.

---

## Bloque 18 — Próximos pasos

1. Ronda de preguntas en Wherex.
2. Demostración de la plataforma: el flujo completo de un cliente de exportación, con su especificación técnica, su oportunidad con aprobación, la visita registrada desde el móvil y el reporte por país.
3. Prueba técnica de seguridad previa a producción, con el equipo TI de Fiordo Austral.
4. Inicio de la fase de descubrimiento a la firma del contrato.

---

## Bloque 19 — Cierre

**Su venta técnica, en un solo lugar y con la seguridad de su identidad Microsoft.**

Efeonce Group SpA · Certified HubSpot Solutions Partner
efeoncepro.com

▸ Diseño: `close-proposal-horizon` con el plate BR3h, la firma Efeonce y la insignia de partner. El eslogan de la línea va según su regla de uso.
