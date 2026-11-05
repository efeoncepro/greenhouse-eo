# Anexo — Matriz de cumplimiento de ciberseguridad

**Licitación:** «Implementación de plataforma CRM» — Pesquera Fiordo Austral S.A. (Wherex N.º 428823)
**Oferente:** Efeonce Group SpA, HubSpot Certified Solutions Partner
**Solución ofertada:** HubSpot Sales Hub Enterprise (10 asientos), con implementación, integración y soporte de Efeonce
**Fecha de consulta de las fuentes oficiales:** 5 de noviembre de 2026

---

## 1. Propósito del anexo

Este anexo responde cada requisito de la sección 4 «Cyberseguridad» de las bases, incluidos los «Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft» y los requisitos que formarán parte de las pruebas de aceptación antes de la puesta en producción.

Para cada requisito se informan las columnas solicitadas en las bases:
- estado de cumplimiento;
- si la funcionalidad viene incluida en la licencia;
- configuración adicional;
- costos asociados;
- plazo de implementación;
- limitaciones;
- responsable;
- evidencia.

Efeonce ha preferido declarar con exactitud qué cubre la plataforma de forma nativa y qué se resuelve con controles complementarios. Una matriz precisa permite a Fiordo Austral evaluar el riesgo real y preparar la prueba técnica previa a producción.

## 2. Alcance

- **Licencias:** HubSpot Sales Hub Enterprise para aproximadamente 10 usuarios. Es la edición que habilita los controles exigidos por las bases:
  - API de registros de auditoría;
  - categorías completas de auditoría;
  - ambiente de pruebas (sandbox) separado de producción;
  - conjuntos de permisos (permission sets);
  - datos sensibles con permisos por campo;
  - respaldo diario programado.
- **Servicios de Efeonce:** diseño, configuración, integración con el entorno Microsoft de Fiordo Austral, controles complementarios (colector hacia Wazuh, respaldo inmutable, control de sesión), evidencias, pruebas de aceptación, capacitación y soporte post-implementación.

### Plan de implementación de referencia para la columna «Plazo»

| Fase | Semanas |
| --- | --- |
| F0 Descubrimiento y diseño | 1–2 |
| F1 Seguridad e identidad | 2–4 |
| F2 Configuración del CRM | 3–6 |
| F3 Migración desde Excel | 5–6 |
| F4 Integraciones | 6–8 |
| F5 Pruebas de aceptación y prueba técnica de seguridad | 9–10 |
| F6 Capacitación y puesta en marcha | 11–12 |
| F7 Estabilización | 13–16 |

## 3. Modelo de responsabilidad compartida

| Actor | Responsabilidad |
| --- | --- |
| **HubSpot** | Opera la plataforma SaaS: infraestructura, alta disponibilidad, cifrado de la plataforma, parches, gestión de vulnerabilidades, monitoreo de su infraestructura y respuesta a incidentes de la plataforma. |
| **Efeonce** | Configura la plataforma con los controles de la licencia, construye e integra los controles complementarios y entrega las evidencias. Ejecuta las pruebas de aceptación y la prueba técnica, y presta el soporte post-implementación. |
| **Fiordo Austral** | Administra su tenant Microsoft: Entra ID, políticas de Acceso Condicional, licencias Microsoft, dispositivos y su SIEM Wazuh. Efeonce diseña las políticas junto a su equipo de TI, pero su aplicación en el tenant queda bajo la administración de Fiordo Austral. |
| **Microsoft** | Provee los servicios de identidad y control de sesión (Entra ID, Defender for Cloud Apps, Intune) según las licencias que Fiordo Austral tenga contratadas. |

## 4. Resumen de cumplimiento

Conteo sobre los requisitos de la matriz, en la edición Sales Hub Enterprise con los servicios de Efeonce:

| Estado | Cantidad |
| --- | --- |
| Cumple | 41 |
| Cumple parcialmente | 24 |
| Requiere desarrollo | 7 |
| No cumple | 2 |
| **Total** | **74** |

**Los dos «No cumple» corresponden a información que HubSpot no publica:**
- el RTO y el RPO comprometidos;
- las ventanas de mantenimiento programadas.

Efeonce solicitará a HubSpot, por intermedio del canal partner, una declaración escrita sobre ambos puntos. En el SLA de su propio servicio, Efeonce compromete tiempos de recuperación para la capa que opera: configuración, integraciones y respaldo.

**Los «Requiere desarrollo» son controles complementarios que Efeonce incluye en su alcance:**
- colector hacia Wazuh;
- respaldo inmutable;
- control compensatorio de sesión única;
- procedimientos documentados;
- gestión de credenciales de integración.

La integración con QAD también figura como «Requiere desarrollo». Es deseable y no excluyente, y se cotiza por separado.

---

## 5. Matriz de cumplimiento

**Abreviaturas de la columna «Plazo»:** F0 a F7 según la tabla de la sección 2.

**Referencias de la columna «Evidencia»:** los códigos [S1] a [S23] remiten a la sección 7.

### 5.1 Control de acceso

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Control de acceso por usuario, con cuentas nominativas | Cumple | Sí | Un asiento por usuario; altas y bajas automatizadas desde Entra ID mediante SCIM | Sin costo adicional | F1 (sem. 2–3) | El aprovisionamiento SCIM con Entra ID usa una configuración personalizada y admite un solo proveedor de identidad | Efeonce / Fiordo Austral | [S2], [S9] |
| 2 | Autenticación multifactor obligatoria | Cumple | Sí | Inicio de sesión único obligatorio: el MFA lo aplica Entra ID. Las cuentas de emergencia usan el 2FA nativo de HubSpot con passkey o app autenticadora | Sin costo adicional | F1 (sem. 2) | El 2FA nativo de HubSpot aplica a inicios con usuario y contraseña; con SSO, el factor adicional lo exige Entra ID | Fiordo Austral / Efeonce | [S1], [S3] |
| 3 | Inicio de sesión único mediante Microsoft Entra ID | Cumple | Sí | Aplicación de HubSpot desde la galería de Entra ID con SAML; SSO obligatorio para todos los usuarios, con excepciones documentadas solo para cuentas de emergencia | Sin costo adicional | F1 (sem. 2) | Requiere un usuario Super Admin en HubSpot y un administrador de aplicaciones en Entra ID | Fiordo Austral / Efeonce | [S1], [S21] |
| 4 | Perfiles de acceso basados en roles | Cumple | Sí | Conjuntos de permisos por perfil: vendedor, jefatura comercial, administrador y solo lectura | Sin costo adicional | F1–F2 (sem. 2–4) | — | Efeonce | [S9] |
| 5 | Principio de mínimo privilegio | Cumple | Sí | Visibilidad por propietario o equipo, permisos por herramienta, número mínimo de Super Admin y datos sensibles con permisos por campo | Sin costo adicional | F1–F2 (sem. 2–4) | HubSpot advierte que la restricción de edición de propiedades no sustituye un control de seguridad completo; por eso se combina con Datos Sensibles | Efeonce | [S9], [S10] |
| 6 | Bloqueo de autenticación heredada | Cumple | Sí (HubSpot); requiere licencia Entra ID P1 para la política en Entra | En HubSpot: SSO obligatorio y deshabilitación de usuario/contraseña e inicios sociales. En Entra ID: política de Acceso Condicional que bloquea la autenticación heredada | Licencia Entra ID P1 de Fiordo Austral, a confirmar | F1 (sem. 2) | Se mantienen una o dos cuentas de emergencia exentas, documentadas y monitoreadas | Fiordo Austral / Efeonce | [S1], [S4] |

### 5.2 Respaldo y recuperación

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | Respaldo automático de la información | Cumple | Sí | Respaldo diario programado de los objetos del CRM (función de la edición Enterprise) | Sin costo adicional | F1 (sem. 3) | El respaldo nativo no incluye asociaciones ni actividades; el archivo generado debe descargarse dentro de 14 días. Se complementa con la exportación vía API del ítem 9 | HubSpot / Efeonce | [S12] |
| 8 | Respaldo cifrado | Cumple parcialmente | Parcial | HubSpot cifra sus copias internas. El archivo de respaldo se deposita en el almacenamiento cifrado de Fiordo Austral (Azure Blob Storage) | Costo de almacenamiento en la suscripción Azure de Fiordo Austral | F1 (sem. 3–4) | El archivo descargable no viene cifrado de origen; el cifrado lo provee el almacenamiento de destino | Efeonce / Fiordo Austral | [S12], [S20] |
| 9 | Copias aisladas o inmutables | Requiere desarrollo | No | Proceso de Efeonce que extrae diariamente el respaldo y los datos vía API, incluidas asociaciones y actividades, y los deposita en Azure Blob Storage con política de inmutabilidad (WORM) en el tenant de Fiordo Austral. Alternativa: aplicación de respaldo de terceros del marketplace de HubSpot, previa validación de sus garantías de inmutabilidad | Desarrollo incluido en la oferta de Efeonce; almacenamiento a cargo de Fiordo Austral. Alternativa de terceros desde USD 25/mes (precio público del proveedor) | F1–F4 (sem. 3–7) | La plataforma no ofrece copias inmutables de forma nativa | Efeonce / Fiordo Austral | [S12], [S22] |
| 10 | Política de retención definida | Cumple parcialmente | Parcial | Definición de la retención propia en el destino del respaldo, por ejemplo copias diarias por 12 meses y mensuales por 7 años, a acordar con Fiordo Austral | Almacenamiento a cargo de Fiordo Austral | F1 (sem. 3–4) | La retención interna de HubSpot no es configurable por el cliente: papelera de 90 días y reversión de cambios de hasta 14 días | Efeonce / Fiordo Austral | [S13], [S14], [S20] |
| 11 | Pruebas periódicas de restauración | Cumple parcialmente | Parcial (el sandbox está incluido) | Restauración de prueba en el ambiente sandbox antes de producción y luego cada trimestre, con conciliación de conteos y acta | Incluido en implementación y soporte de Efeonce | F5 (sem. 9–10) y trimestral | La restauración desde el respaldo se realiza por importación o API; no existe una restauración nativa «en un clic» desde el archivo | Efeonce | [S11], [S12] |
| 12 | Procedimientos documentados de recuperación | Requiere desarrollo | No | Manual de recuperación de Efeonce: papelera, reversión de cambios, restauración desde respaldo y escalamiento a HubSpot | Incluido en la oferta de Efeonce | F1–F5 (sem. 4–10) | — | Efeonce | [S13], [S14] |

### 5.3 Registros de auditoría

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | Registro de accesos y autenticaciones | Cumple | Sí | Historial de inicios de sesión y API de inicios de sesión; envío a Wazuh (ítem 41) | Sin costo adicional | F1 (sem. 3) | La interfaz conserva 30 días; la retención de largo plazo se resuelve en Wazuh | HubSpot / Efeonce | [S7], [S8] |
| 14 | Registro de cambios de configuración | Cumple | Sí | — | Sin costo adicional | — | — | HubSpot | [S7] |
| 15 | Registro de creación, modificación y eliminación de información | Cumple | Sí | Registro de auditoría completo por interfaz y API; historial de propiedades en cada registro | Sin costo adicional | — | El registro cubre las acciones de usuarios; los cambios originados por formularios o integraciones se trazan por el historial de propiedades | HubSpot | [S7], [S8] |
| 16 | Registro de exportación y descarga de información | Cumple parcialmente | Sí | Activación de notificaciones de exportación y envío de esos eventos a Wazuh | Sin costo adicional | F1 (sem. 3) | El nivel de detalle del registro de descargas individuales se validará en la prueba técnica | HubSpot / Efeonce | [S7] |
| 17 | Identificación del usuario, fecha, hora, origen y resultado de la acción | Cumple parcialmente | Sí | Normalización de los campos en el colector hacia Wazuh | Incluido en la oferta de Efeonce | F1–F4 | Los eventos traen usuario, fecha y hora, acción, objeto y ubicación aproximada; el campo «resultado» explícito por evento se validará en la prueba técnica | HubSpot / Efeonce | [S7] |
| 18 | Registros protegidos contra alteración | Cumple parcialmente | Parcial | Copia en Wazuh como registro de custodia de Fiordo Austral, con sus controles de integridad | Sin costo adicional de licencia | F1–F4 (sem. 3–7) | Los usuarios no pueden editar los registros, pero HubSpot no publica una declaración formal de inalterabilidad | HubSpot / Fiordo Austral | [S7] |
| 19 | Registros disponibles para revisión y exportación | Cumple | Sí | Exportación por interfaz (Super Admin) y por API | Sin costo adicional | — | — | HubSpot | [S7], [S8] |

### 5.4 Roles y cuentas compartidas

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Indicar los roles estándar disponibles | Cumple | Sí | Super Admin y permisos por herramienta y por usuario; la matriz de roles propuesta se entrega en F0 | Sin costo adicional | F0 (sem. 1–2) | — | Efeonce | [S9] |
| 21 | Posibilidad de crear roles personalizados | Cumple | Sí | Conjuntos de permisos (permission sets) personalizados | Sin costo adicional | F1 (sem. 2–3) | — | Efeonce | [S9] |
| 22 | Mecanismos para evitar cuentas compartidas | Cumple | Sí | Asientos nominativos, SSO con Entra ID, SCIM y política de prohibición de cuentas genéricas | Sin costo adicional | F1 (sem. 2) | — | Fiordo Austral / Efeonce | [S1], [S2] |
| 23 | Sesión única: no se permite multisesión | Requiere desarrollo | No | HubSpot no ofrece un control nativo de sesiones concurrentes. Control compensatorio: (1) control de sesión de Entra ID mediante Defender for Cloud Apps; (2) frecuencia de inicio de sesión acotada en Entra ID y tiempo de inactividad corto en HubSpot; (3) regla en Wazuh que detecta sesiones simultáneas desde dispositivos o direcciones distintas, con cierre remoto de todas las sesiones del usuario | Licencia Defender for Cloud Apps de Fiordo Austral, a confirmar; configuración y regla incluidas en la oferta de Efeonce | F1 (sem. 3–4) | El control es compensatorio, no nativo. La aplicación móvil mantiene la sesión hasta 30 días, lo que se acota con las políticas de Entra ID y de dispositivos | Fiordo Austral / Efeonce | [S6], [S7] |

### 5.5 Seguridad de los datos

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | Cifrado en tránsito | Cumple | Sí | — | Sin costo adicional | — | Conexiones HTTPS/TLS 1.2 y 1.3 obligatorias | HubSpot | [S16], [S20] |
| 25 | Cifrado en reposo | Cumple | Sí | Activación de Datos Sensibles, que suma cifrado a nivel de aplicación para propiedades clasificadas | Sin costo adicional | F1–F2 | HubSpot declara cifrado en reposo por capas; el algoritmo específico se acredita con el informe SOC 2 Type II | HubSpot | [S10], [S16] |
| 26 | Separación lógica entre clientes | Cumple parcialmente | Sí | — | Sin costo adicional | — | Plataforma multiinquilino; la segregación se acredita con el informe SOC 2 Type II, entregable bajo acuerdo de confidencialidad | HubSpot | [S16], [S19] |
| 27 | Controles contra acceso no autorizado | Cumple | Sí | SSO, MFA, restricción por IP de confianza y por ubicación aprobada, y permisos | Sin costo adicional | F1 (sem. 2–3) | — | HubSpot / Fiordo Austral | [S1], [S3], [S5] |
| 28 | Prevención de fuga de información | Cumple parcialmente | Parcial | Restricción de permisos de exportación, notificaciones de exportación y Datos Sensibles; bloqueo de descargas en sesión mediante Defender for Cloud Apps | Licencia Defender for Cloud Apps de Fiordo Austral, a confirmar | F1 (sem. 3–4) | HubSpot no incorpora una solución de prevención de pérdida de datos (DLP) propia | Fiordo Austral / Efeonce | [S10] |
| 29 | Clasificación y retención de datos | Cumple parcialmente | Parcial | Clasificación de propiedades como sensibles o altamente sensibles; matriz de clasificación y retención por proceso | Sin costo adicional | F2 (sem. 3–6) | La plataforma no aplica políticas automáticas de retención por objeto | Efeonce / Fiordo Austral | [S10] |
| 30 | Eliminación segura al término del servicio | Cumple | Sí | Solicitud de certificado de borrado al término | Sin costo adicional | Al término | Los respaldos archivados de la plataforma se eliminan conforme a las prácticas de HubSpot | HubSpot | [S16] |
| 31 | Restricción de exportaciones masivas | Cumple | Sí | Exportación reservada a administradores y alertas de exportación hacia Wazuh | Sin costo adicional | F1 (sem. 3) | — | Efeonce / Fiordo Austral | [S7], [S9] |
| 32 | Informar ubicación y jurisdicción de almacenamiento | Cumple | Sí | Elección del centro de datos (Unión Europea – Alemania, o Estados Unidos) antes del alta | Sin costo adicional | Antes del alta | No existe región de alojamiento en Chile ni en Latinoamérica | HubSpot / Fiordo Austral | [S15] |
| 33 | Informar los subencargados que procesan información | Cumple | Sí | Se adjunta la lista vigente publicada por HubSpot | Sin costo adicional | — | La lista incluye proveedores de inteligencia artificial; las funciones de IA pueden deshabilitarse si Fiordo Austral lo requiere | HubSpot | [S18] |
| 34 | Mecanismos de portabilidad y devolución de datos | Cumple | Sí | Plan de salida en el manual de operación | Sin costo adicional | — | — | HubSpot / Efeonce | [S16] |
| 35 | Medidas aplicables a dispositivos móviles | Cumple parcialmente | Parcial | SSO y MFA en la aplicación móvil, restricción por IP también aplicable al móvil y Acceso Condicional con dispositivo administrado | Licencias Intune y Entra ID de Fiordo Austral, a confirmar | F1 (sem. 3–4) | La aplicación mantiene la sesión hasta 30 días; la compatibilidad con políticas de protección de aplicaciones de Intune se validará en la prueba técnica | Fiordo Austral / Efeonce | [S5], [S6] |

### 5.6 Gestión de vulnerabilidades

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | Programa documentado de gestión de vulnerabilidades: inventario, análisis periódicos, pentest independiente, dependencias, configuraciones y parches | Cumple | Sí | — | Sin costo adicional | — | El detalle de inventario y dependencias se acredita con el informe SOC 2 Type II | HubSpot | [S16], [S19] |
| 37 | Plazos máximos de remediación según criticidad | Cumple parcialmente | Sí | Solicitud formal a HubSpot vía canal partner. Los componentes desarrollados por Efeonce se remedian según el SLA de soporte | Sin costo adicional | F0 | HubSpot no publica plazos por criticidad | HubSpot / Efeonce | [S16] |
| 38 | Procedimiento para vulnerabilidades sin parche | Cumple parcialmente | Sí | Solicitud formal a HubSpot; procedimiento propio de Efeonce para sus componentes | Sin costo adicional | F0 | No publicado por HubSpot | HubSpot / Efeonce | [S16] |
| 39 | Comunicación de riesgos relevantes | Cumple | Sí | Suscripción del equipo de TI a la página de estado de HubSpot; Efeonce informa los riesgos que afecten la configuración | Sin costo adicional | F6 | — | HubSpot / Efeonce | [S16], [S23] |
| 40 | Entrega de evidencia o informes ejecutivos de las evaluaciones | Cumple | Sí | Resúmenes de pentest — entregables bajo acuerdo de confidencialidad; SOC 3 público | Sin costo adicional | F0 | — | HubSpot | [S16], [S19] |

### 5.7 Desarrollo seguro, integraciones y cambios

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 41 | Prácticas de desarrollo seguro en aplicaciones web, móviles, interfaces y API | Cumple parcialmente | Sí | Los componentes propios de Efeonce (colector Wazuh, respaldo, integración QAD) se desarrollan con revisión de código, validación de entradas, gestión segura de secretos y cifrado de comunicaciones | Incluido en la oferta de Efeonce | F1–F4 | La práctica de HubSpot se acredita con su programa de seguridad y el informe SOC 2 Type II | HubSpot / Efeonce | [S19] |
| 42 | Autenticación y autorización por cada integración, y limitación de solicitudes | Cumple | Sí | Una aplicación OAuth o privada por integración, con alcances mínimos; la plataforma aplica límites de solicitudes | Sin costo adicional | F4 (sem. 6–8) | — | HubSpot / Efeonce | [S8] |
| 43 | Integraciones con Outlook, Teams, SharePoint y OneDrive con permisos mínimos, credenciales no compartidas, registro de actividad y revocación | Cumple parcialmente | Sí | Consentimiento administrativo en Entra ID para las aplicaciones de Microsoft; revisión y revocación desde Entra ID y HubSpot | Sin costo adicional | F4 (sem. 6–8) | Los alcances los define cada aplicación oficial; se revisarán y aprobarán con TI antes de activarlas | Fiordo Austral / Efeonce | [S21] |
| 44 | Integración con QAD con permisos mínimos, credenciales propias, registro y revocación | Requiere desarrollo | No | Integración a medida vía API de QAD y de HubSpot, con credencial dedicada, registro de actividad y revocación | Se cotiza por separado según la versión y API de QAD (integración deseable, no excluyente) | Factibilidad en F4; construcción posterior | No existe un conector nativo HubSpot–QAD | Efeonce / Fiordo Austral | [S8] |
| 45 | Proceso de gestión de cambios | Cumple | Sí | Flujo de cambios de Efeonce: solicitud, prueba en sandbox, aprobación y paso a producción con registro | Incluido en la oferta de Efeonce | F1 | — | Efeonce | [S11] |
| 46 | Ambientes separados de desarrollo, pruebas y producción | Cumple | Sí | Ambiente sandbox estándar para desarrollo y pruebas, separado del portal de producción | Sin costo adicional | F1 (sem. 2–3) | — | HubSpot / Efeonce | [S11] |

### 5.8 Disponibilidad y continuidad

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 47 | Alta disponibilidad, redundancia de componentes críticos, monitoreo continuo y plan probado de continuidad y recuperación | Cumple | Sí | — | Sin costo adicional | — | Arquitectura distribuida con réplicas en múltiples centros de datos y respaldos frecuentes | HubSpot | [S20] |
| 48 | Disponibilidad mensual comprometida | Cumple parcialmente | Sí | — | Sin costo adicional | — | HubSpot declara 99,95 % mensual como compromiso de esfuerzo comercialmente razonable, no como garantía firme | HubSpot | [S17] |
| 49 | Exclusiones del SLA | Cumple | Sí | — | Sin costo adicional | — | Excluye fuerza mayor, terceros, mal uso y mantenimiento | HubSpot | [S17] |
| 50 | Tiempo objetivo de recuperación (RTO) y punto objetivo de recuperación (RPO) | No cumple | — | Solicitud de declaración escrita a HubSpot. Efeonce compromete RTO/RPO para su capa en el SLA de soporte | Sin costo adicional | F0 | HubSpot no publica RTO ni RPO | HubSpot / Efeonce | [S20] |
| 51 | Ventanas de mantenimiento | No cumple | — | Solicitud de información a HubSpot; los mantenimientos de Efeonce se coordinan con aviso previo | Sin costo adicional | F0 | Las ventanas no se publican y quedan a criterio de HubSpot | HubSpot / Efeonce | [S17] |
| 52 | Arquitectura de redundancia | Cumple | Sí | — | Sin costo adicional | — | — | HubSpot | [S15], [S20] |
| 53 | Frecuencia de pruebas de continuidad | Cumple parcialmente | Sí | Solicitud a HubSpot; las pruebas de restauración de Efeonce son trimestrales (ítem 11) | Sin costo adicional | Trimestral | La frecuencia no se publica; se acredita con el informe SOC 2 Type II | HubSpot / Efeonce | [S19] |
| 54 | Compensaciones por incumplimiento | Cumple parcialmente | Sí | — | Sin costo adicional | — | Crédito prorrateado solo si el incumplimiento se repite dos o más meses consecutivos | HubSpot | [S17] |
| 55 | Historial reciente de disponibilidad del servicio | Cumple | Sí | Se adjunta el historial publicado en la página de estado | Sin costo adicional | — | — | HubSpot | [S23] |

### 5.9 Incidentes y evidencias

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 56 | Monitoreo de seguridad, detección y respuesta, escalamiento y canal permanente para eventos críticos | Cumple | Sí | Mesa de soporte de Efeonce con guardia permanente para incidentes críticos de seguridad y escalamiento a HubSpot y Microsoft | Incluido en soporte de Efeonce | F6 | — | HubSpot / Efeonce | [S16], [S19] |
| 57 | Notificación oportuna, preservación de evidencias, informe de alcance, contención y causa raíz; tiempos por severidad | Cumple parcialmente | Sí | Efeonce compromete tiempos por severidad para su servicio (respuesta ≤ 1 h en severidad crítica e informe de causa raíz ≤ 5 días hábiles) | Incluido en soporte de Efeonce | F6 | HubSpot notifica brechas de datos personales sin demora indebida y a más tardar en 72 horas; no publica tiempos por severidad | HubSpot / Efeonce | [S16] |
| 58 | Certificaciones o informes de auditoría independiente | Cumple | Sí | Entrega de SOC 3 y, bajo acuerdo de confidencialidad, SOC 2 Type II | Sin costo adicional | F0 | HubSpot no declara certificación ISO 27001 propia; el proveedor de infraestructura (AWS) sí cuenta con ISO 27001 y SOC 2 | HubSpot | [S15], [S19] |
| 59 | Políticas de seguridad, privacidad y gestión de terceros | Cumple | Sí | Se adjuntan el DPA, la política de seguridad y la lista de subencargados | Sin costo adicional | — | — | HubSpot | [S16], [S18], [S19] |
| 60 | Capacitación del personal del proveedor y antecedentes del centro de datos | Cumple parcialmente | Sí | — | Sin costo adicional | — | Antecedentes del centro de datos acreditados (AWS); la capacitación del personal de HubSpot se acredita con el informe SOC 2 Type II | HubSpot | [S15], [S19] |

### 5.10 Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | Integración mediante conector o API con el SIEM Wazuh | Requiere desarrollo | Parcial (API incluida) | Colector desarrollado por Efeonce que consulta periódicamente las API de registros de auditoría, inicios de sesión y actividad de seguridad de HubSpot, normaliza los eventos y los entrega a Wazuh (syslog o archivo leído por su agente), con decodificadores y reglas de detección. Los registros de Entra ID se envían a Wazuh por su integración con Microsoft | Desarrollo incluido en la oferta de Efeonce; alojamiento del colector en infraestructura de Fiordo Austral o de Efeonce, a definir | F1–F4 (sem. 3–7) | No existe conector nativo. Los eventos llegan con una latencia de minutos | Efeonce / Fiordo Austral | [S8] |
| 62 | Aplicaciones empresariales con permisos mínimos y consentimiento administrativo controlado | Cumple parcialmente | Sí | Consentimiento administrativo obligatorio en Entra ID; alcances mínimos en las aplicaciones privadas de HubSpot | Sin costo adicional | F1 (sem. 2–3) | Los alcances de las aplicaciones oficiales los define cada fabricante | Fiordo Austral / Efeonce | [S21] |
| 63 | No usar secretos permanentes cuando exista autenticación por certificado, identidad administrada o federación | Requiere desarrollo | Parcial | Usuarios: autenticación federada (SAML con Entra ID). Integraciones: tokens guardados en Azure Key Vault con rotación periódica, o aplicación OAuth con tokens de refresco | Incluido en la oferta de Efeonce; Key Vault en la suscripción de Fiordo Austral | F1–F4 | La API de HubSpot no admite autenticación por certificado | Efeonce / Fiordo Austral | [S8] |
| 64 | Revisar, revocar y auditar permisos, tokens y consentimientos | Cumple | Sí | Revisión trimestral de accesos, aplicaciones y consentimientos | Incluido en soporte de Efeonce | Continuo | — | Fiordo Austral / Efeonce | [S7], [S8] |
| 65 | Arquitectura Zero Trust: verificación explícita de cada acceso según identidad, riesgo, dispositivo, ubicación, sensibilidad y sesión | Cumple parcialmente | Parcial | Políticas de Acceso Condicional en Entra ID diseñadas con TI, restricción por IP y ubicación en HubSpot y Datos Sensibles | Licencias Entra ID P1/P2, Intune y Defender for Cloud Apps de Fiordo Austral, a confirmar | F1 (sem. 2–4) | La evaluación por riesgo, dispositivo y sesión depende de las licencias Microsoft disponibles | Fiordo Austral / Efeonce | [S5], [S10], [S21] |
| 66 | Cifrado TLS 1.2 o superior en tránsito | Cumple | Sí | — | Sin costo adicional | — | — | HubSpot | [S20] |
| 67 | AES-256 o equivalente en reposo | Cumple parcialmente | Sí | Confirmación del algoritmo con el informe SOC 2 Type II | Sin costo adicional | F0 | El algoritmo no se publica en la documentación abierta | HubSpot | [S16] |
| 68 | Administración segura y rotación de claves | Cumple parcialmente | Sí | — | Sin costo adicional | — | Las claves son gestionadas por HubSpot y su proveedor de infraestructura; no se ofrecen claves administradas por el cliente | HubSpot | [S16] |
| 69 | Respaldo cifrado e inmutable | Requiere desarrollo | No | Ver ítems 8 y 9 | Ver ítems 8 y 9 | F1–F4 | — | Efeonce / Fiordo Austral | [S12], [S22] |
| 70 | Declaración de regiones de almacenamiento, procesamiento, respaldo y recuperación | Cumple | Sí | Declaración escrita según el centro de datos elegido | Sin costo adicional | Antes del alta | La recuperación ante desastres opera dentro de la región elegida; algunos procesamientos (soporte, IA) pueden ocurrir fuera de ella | HubSpot | [S15], [S18] |
| 71 | SLA mensual ≥ 99,9 %, monitoreo permanente, pruebas anuales de continuidad, respaldo geográficamente separado y evidencia de restauraciones exitosas | Cumple parcialmente | Sí | Las restauraciones trimestrales de Efeonce constituyen la evidencia de restauración para Fiordo Austral | Incluido en soporte de Efeonce | Trimestral | Ver ítems 48, 50 y 53 | HubSpot / Efeonce | [S17], [S20] |
| 72 | MFA resistente al phishing y Acceso Condicional | Cumple | Sí (HubSpot); requiere Entra ID P1 | Política de Acceso Condicional para la aplicación HubSpot con «Authentication strength» resistente al phishing (FIDO2, Windows Hello o passkeys) | Licencia Entra ID P1 de Fiordo Austral, a confirmar | F1 (sem. 2) | — | Fiordo Austral / Efeonce | [S1], [S3] |
| 73 | Gestión de privilegios | Cumple | Sí (HubSpot); PIM requiere Entra ID P2 | Conjuntos de permisos, Super Admin mínimo y activación just-in-time del rol de administrador mediante PIM | Licencia Entra ID P2 de Fiordo Austral, a confirmar | F1 (sem. 2–3) | — | Fiordo Austral / Efeonce | [S9] |
| 74 | Indicar las licencias Microsoft y del CRM requeridas, costos adicionales, limitaciones y evidencias de configuración | Cumple | — | Ver sección 6.2 | Ver oferta económica | F0 | — | Efeonce | — |

---

## 6. Requisitos obligatorios de aceptación antes de producción

### 6.1 Cómo se demostrará cada requisito en la prueba técnica

La prueba técnica se ejecutará en la fase F5 (semanas 9 y 10). La ejecuta Efeonce junto con el equipo de TI de Fiordo Austral, en el ambiente de producción preparado y antes de habilitar a los usuarios. Cada prueba deja un acta con evidencia.

| Requisito | Demostración en la prueba técnica | Evidencia entregada |
| --- | --- | --- |
| Integración con Entra ID | Inicio de sesión de un usuario de prueba por SSO; intento de acceso con usuario y contraseña rechazado | Capturas de configuración SAML y registro de inicios de sesión |
| MFA resistente al phishing | Inicio de sesión que exige un método resistente al phishing; intento con un método débil rechazado | Política de Acceso Condicional exportada y registro de Entra ID |
| Acceso Condicional | Acceso desde un dispositivo o ubicación no autorizados bloqueado | Registro de inicios de sesión de Entra ID |
| Administración de usuarios | Alta, cambio de rol y baja de un usuario desde Entra ID mediante SCIM, reflejados en HubSpot | Registro de aprovisionamiento y auditoría de HubSpot |
| Gestión de privilegios | Verificación de la matriz de roles y del número de Super Admin; activación de privilegio de administrador vía PIM, si aplica | Matriz de roles y registro de auditoría |
| Registro hacia SIEM | Generación de eventos de prueba (inicio de sesión, exportación, cambio de configuración) y verificación de su llegada a Wazuh | Consulta en Wazuh con los eventos recibidos |
| Sesión única | Inicio de sesión simultáneo desde dos dispositivos: alerta en Wazuh y cierre remoto de sesiones | Alerta de Wazuh y registro de cierre de sesiones |
| Cifrado | Verificación de TLS en las conexiones y de Datos Sensibles activado | Informe de conexión y configuración; SOC 2 Type II bajo acuerdo de confidencialidad |
| Auditoría | Consulta y exportación del registro de auditoría de las acciones ejecutadas en la prueba | Archivo exportado |
| Respaldo probado | Ejecución del respaldo, verificación de la copia inmutable y restauración en el sandbox con conciliación de conteos | Acta de restauración con conteos |
| Recuperación | Recuperación de un registro eliminado y reversión de un cambio masivo de prueba | Acta y registro de auditoría |
| Parches y actualizaciones | Revisión del procedimiento de actualización de los componentes de Efeonce y de la página de estado de HubSpot | Procedimiento documentado |
| Respuesta a incidentes | Simulacro de un incidente de severidad crítica: aviso, escalamiento, contención y registro | Acta del simulacro con tiempos |
| Alta disponibilidad | Revisión de la arquitectura de redundancia y del historial de disponibilidad publicados por HubSpot | Documentación oficial adjunta |

### 6.2 Licencias requeridas

**Licencias del CRM**
- HubSpot Sales Hub Enterprise, 10 asientos (ver oferta económica).

**Licencias Microsoft que podrían requerirse, a confirmar con Fiordo Austral según lo que ya tenga contratado (por ejemplo Microsoft 365 E3, E5 o Business Premium):**

| Licencia | Para qué se usa | Estado |
| --- | --- | --- |
| Microsoft Entra ID P1 | Acceso Condicional, bloqueo de autenticación heredada y MFA resistente al phishing | A confirmar con Fiordo Austral |
| Microsoft Entra ID P2 | Evaluación por riesgo e inicio de sesión, y Privileged Identity Management (PIM) | A confirmar con Fiordo Austral |
| Microsoft Defender for Cloud Apps | Control de sesión (control compensatorio de sesión única) y bloqueo de descargas | A confirmar con Fiordo Austral |
| Microsoft Intune | Acceso Condicional basado en dispositivo administrado | A confirmar con Fiordo Austral |

Efeonce, como revendedor CSP de Microsoft, puede cotizar las licencias faltantes si Fiordo Austral lo solicita.

---

## 7. Fuentes oficiales (consultadas el 5 de noviembre de 2026)

| Código | Fuente |
| --- | --- |
| S1 | HubSpot — Set up single sign-on (SSO): https://knowledge.hubspot.com/account-security/set-up-single-sign-on-sso |
| S2 | HubSpot — Provision users with SCIM: https://knowledge.hubspot.com/account-security/provision-hubspot-users-with-scim-through-google |
| S3 | HubSpot — Set up two-factor authentication: https://knowledge.hubspot.com/account-security/set-up-two-factor-authentication-for-your-hubspot-login |
| S4 | HubSpot — Restrict login methods: https://knowledge.hubspot.com/account-security/restrict-which-login-methods-users-can-use-to-access-your-account |
| S5 | HubSpot — Manage login and account access settings: https://knowledge.hubspot.com/account-security/limit-logins-to-trusted-ip-addresses |
| S6 | HubSpot — Log out of HubSpot: https://knowledge.hubspot.com/account-management/log-out-of-hubspot |
| S7 | HubSpot — View and export account activity history: https://knowledge.hubspot.com/account-management/view-and-export-account-activity-history |
| S8 | HubSpot — Account activity API: https://developers.hubspot.com/docs/api-reference/account-audit-logs-v3/guide |
| S9 | HubSpot — Manage user permissions: https://knowledge.hubspot.com/user-management/manage-user-permissions |
| S10 | HubSpot — Store Sensitive Data: https://knowledge.hubspot.com/account-security/store-sensitive-data |
| S11 | HubSpot — Standard sandbox: https://knowledge.hubspot.com/account-management/set-up-a-hubspot-standard-sandbox-account |
| S12 | HubSpot — Back up CRM data: https://knowledge.hubspot.com/object-settings/back-up-crm-data |
| S13 | HubSpot — Restore CRM changes: https://knowledge.hubspot.com/object-settings/restore-crm-changes |
| S14 | HubSpot — Restore deleted records: https://knowledge.hubspot.com/records/restore-deleted-records |
| S15 | HubSpot — Cloud infrastructure and data hosting FAQ: https://knowledge.hubspot.com/account-security/hubspot-cloud-infrastructure-and-data-hosting-frequently-asked-questions |
| S16 | HubSpot — Data Processing Agreement (DPA): https://legal.hubspot.com/dpa |
| S17 | HubSpot — Product Specific Terms, §9 Service Uptime Commitment: https://legal.hubspot.com/product-specific-terms |
| S18 | HubSpot — Sub-processors: https://legal.hubspot.com/sub-processors-page |
| S19 | HubSpot — Security and Compliance: https://www.hubspot.com/security-and-compliance |
| S20 | HubSpot — Reliability: https://www.hubspot.com/reliability |
| S21 | Microsoft — Microsoft Entra SSO integration with HubSpot: https://learn.microsoft.com/en-us/entra/identity/saas-apps/hubspot-tutorial |
| S22 | HubSpot App Marketplace — ProBackup: https://ecosystem.hubspot.com/marketplace/listing/pro-backup-380854 · SysCloud Backup: https://ecosystem.hubspot.com/marketplace/listing/syscloud-backup-for-hubspot-595013 |
| S23 | HubSpot — Página de estado: https://status.hubspot.com/ |

**Evidencias bajo acuerdo de confidencialidad:** SOC 2 Type II y resúmenes de pruebas de penetración de HubSpot. Se gestionarán con HubSpot a solicitud de Fiordo Austral.
