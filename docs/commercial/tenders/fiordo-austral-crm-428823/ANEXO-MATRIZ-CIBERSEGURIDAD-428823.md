# Anexo — Matriz de cumplimiento de ciberseguridad

**Licitación:** «Implementación de plataforma CRM» — Pesquera Fiordo Austral S.A. (Wherex N.º 428823)
**Oferente:** Efeonce Group SpA, HubSpot Certified Solutions Partner
**Solución ofertada:** HubSpot Sales Hub Professional (10 licencias), con implementación, integración, controles complementarios y soporte de Efeonce
**Fecha de consulta de las fuentes oficiales:** 5 de noviembre de 2026

---

## 1. Propósito del anexo

Este anexo responde cada requisito de la sección 4 «Cyberseguridad» de las bases. Incluye los «Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft» y los requisitos que formarán parte de las pruebas de aceptación antes de la puesta en producción.

Para cada requisito se informan las columnas solicitadas en las bases:
- estado de cumplimiento;
- si la funcionalidad viene incluida en la licencia;
- configuración adicional;
- costos asociados;
- plazo de implementación;
- limitaciones;
- responsable;
- evidencia.

Efeonce ha preferido declarar con exactitud qué cubre la plataforma de forma nativa en la edición ofertada y qué se resuelve con controles complementarios. Una matriz precisa permite a Fiordo Austral evaluar el riesgo real y preparar la prueba técnica previa a producción.

## 2. Alcance

- **Licencias:** HubSpot Sales Hub Professional para aproximadamente 10 usuarios.
  - **Incluido en la edición:** inicio de sesión único con Microsoft Entra ID, SSO obligatorio, aprovisionamiento SCIM, autenticación de dos factores, permisos por usuario y por equipo, historial de inicios de sesión y de actividad de seguridad, historial de propiedades en cada registro, reversión de cambios del CRM y papelera de registros eliminados.
- **Servicios de Efeonce:**
  - Diseño y configuración de la plataforma.
  - Integración con el entorno Microsoft de Fiordo Austral.
  - Controles complementarios:
    - colector de eventos hacia Wazuh;
    - respaldo diario e inmutable vía API;
    - control de sesión;
    - configuración controlada con cuenta de pruebas separada.
  - Evidencias, pruebas de aceptación, capacitación y soporte post-implementación.

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
| **Fiordo Austral** | Administra su tenant Microsoft: Entra ID, políticas de Acceso Condicional, licencias Microsoft, dispositivos y su SIEM Wazuh. Efeonce diseña las políticas junto a su equipo de TI; su aplicación en el tenant queda bajo la administración de Fiordo Austral. |
| **Microsoft** | Provee los servicios de identidad y control de sesión (Entra ID, Defender for Cloud Apps, Intune) según las licencias que Fiordo Austral tenga contratadas. |

## 4. Resumen de cumplimiento

Conteo sobre los requisitos de la matriz, en la edición Sales Hub Professional con los servicios de Efeonce:

| Estado | Cantidad |
| --- | --- |
| Cumple | 29 |
| Cumple parcialmente | 33 |
| Requiere desarrollo | 10 |
| No cumple | 2 |
| **Total** | **74** |

**Ninguno de los controles que las bases califican como incumplimiento crítico está ausente** (Entra ID, MFA resistente al phishing, Acceso Condicional, registro hacia SIEM, gestión de privilegios, cifrado, respaldo probado y respuesta a incidentes). Donde la edición no los cubre de forma completa, Efeonce los complementa y lo declara como «Cumple parcialmente» o «Requiere desarrollo».

**Los dos «No cumple» corresponden a información que HubSpot no publica:**
- el RTO y el RPO comprometidos;
- las ventanas de mantenimiento programadas.

Efeonce solicitará a HubSpot, por intermedio del canal partner, una declaración escrita sobre ambos puntos. En el SLA de su propio servicio, Efeonce compromete tiempos de recuperación para la capa que opera: configuración, integraciones y respaldo.

**Los «Requiere desarrollo» son controles complementarios que Efeonce incluye en su alcance:**
- respaldo diario automático;
- respaldo inmutable;
- pruebas de restauración;
- procedimientos documentados de recuperación;
- control compensatorio de sesión única;
- clasificación y retención de datos;
- colector hacia Wazuh;
- gestión de credenciales de integración.

La integración con QAD también figura como «Requiere desarrollo». Es deseable y no excluyente, y se cotiza por separado.

**Los «Cumple parcialmente» propios de la edición Professional** se concentran en cuatro áreas:
- **Auditoría de acciones sobre datos.** No hay API de registro de auditoría de acciones de usuario. Se cubre con el historial de propiedades y con la comparación de exportaciones programadas.
- **Roles reutilizables.** No hay conjuntos de permisos; los permisos se asignan por usuario con una plantilla documentada.
- **Permisos por campo.** Falta la función de Datos Sensibles.
- **Ambiente de pruebas.** No hay sandbox estándar. Se usa configuración controlada y una cuenta de pruebas separada.

---

## 5. Matriz de cumplimiento

**Abreviaturas de la columna «Plazo»:** F0 a F7, según la tabla de la sección 2.

**Referencias de la columna «Evidencia»:** los códigos [S1] a [S23] remiten a la sección 7.

### 5.1 Control de acceso

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Control de acceso por usuario, con cuentas nominativas | Cumple | Sí | Una licencia por usuario. Altas y bajas automatizadas desde Entra ID mediante SCIM | Sin costo adicional | F1 (sem. 2–3) | El aprovisionamiento SCIM con Entra ID usa una configuración personalizada y admite un solo proveedor de identidad | Efeonce / Fiordo Austral | [S2], [S9] |
| 2 | Autenticación multifactor obligatoria | Cumple | Sí | Inicio de sesión único obligatorio, con el MFA aplicado por Entra ID. Las cuentas de emergencia usan el 2FA nativo de HubSpot con passkey o aplicación autenticadora | Sin costo adicional | F1 (sem. 2) | El 2FA nativo de HubSpot aplica a inicios con usuario y contraseña. Con SSO, el factor adicional lo exige Entra ID | Fiordo Austral / Efeonce | [S1], [S3] |
| 3 | Inicio de sesión único mediante Microsoft Entra ID | Cumple | Sí | Aplicación de HubSpot desde la galería de Entra ID con SAML. SSO obligatorio para todos los usuarios; las únicas excepciones documentadas son las cuentas de emergencia | Sin costo adicional | F1 (sem. 2) | Requiere un usuario Super Admin en HubSpot y un administrador de aplicaciones en Entra ID | Fiordo Austral / Efeonce | [S1], [S21] |
| 4 | Perfiles de acceso basados en roles | Cumple parcialmente | Sí | Matriz de roles (vendedor, jefatura comercial, administrador y solo lectura) aplicada con permisos por usuario y por equipo. Plantilla documentada y revisión trimestral | Sin costo adicional | F1–F2 (sem. 2–4) | La edición Professional no incluye conjuntos de permisos reutilizables. Cada perfil se aplica usuario por usuario según la plantilla | Efeonce | [S9] |
| 5 | Principio de mínimo privilegio | Cumple parcialmente | Sí | Visibilidad por propietario o equipo, permisos por herramienta, permiso de exportación solo para administradores y número mínimo de Super Admin | Sin costo adicional | F1–F2 (sem. 2–4) | Sin la función de Datos Sensibles, no hay restricción de lectura por campo. Las propiedades críticas se protegen con permisos de edición y visibilidad por equipo | Efeonce | [S9], [S10] |
| 6 | Bloqueo de autenticación heredada | Cumple | Sí en HubSpot; en Entra requiere licencia Entra ID P1 para la política | En HubSpot: SSO obligatorio y deshabilitación de usuario y contraseña y de los inicios sociales. En Entra ID: política de Acceso Condicional que bloquea la autenticación heredada | Licencia Entra ID P1 de Fiordo Austral, a confirmar | F1 (sem. 2) | Se mantienen una o dos cuentas de emergencia exentas, documentadas y monitoreadas | Fiordo Austral / Efeonce | [S1], [S4] |

### 5.2 Respaldo y recuperación

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | Respaldo automático de la información | Requiere desarrollo | Parcial: respaldo semanal manual | Proceso de Efeonce que exporta diariamente, vía API del CRM, los objetos, asociaciones y actividades, y los deposita en el almacenamiento de Fiordo Austral | Desarrollo incluido en la oferta de Efeonce; almacenamiento a cargo de Fiordo Austral | F1 (sem. 3–4) | En la edición Professional, el respaldo nativo es semanal y manual, no incluye asociaciones ni actividades y debe descargarse dentro de 14 días | Efeonce / Fiordo Austral | [S12] |
| 8 | Respaldo cifrado | Cumple parcialmente | Parcial | HubSpot cifra sus copias internas. El respaldo de Efeonce se deposita en el almacenamiento cifrado de Fiordo Austral (Azure Blob Storage) | Costo de almacenamiento en la suscripción Azure de Fiordo Austral | F1 (sem. 3–4) | El cifrado del respaldo exportado lo provee el almacenamiento de destino | Efeonce / Fiordo Austral | [S12], [S20] |
| 9 | Copias aisladas o inmutables | Requiere desarrollo | No | El respaldo diario del ítem 7 se escribe en Azure Blob Storage con política de inmutabilidad (WORM), en el tenant de Fiordo Austral. Alternativa: una aplicación de respaldo de terceros del marketplace de HubSpot, previa validación de sus garantías de inmutabilidad | Desarrollo incluido en la oferta de Efeonce; almacenamiento a cargo de Fiordo Austral. La alternativa de terceros parte en USD 25/mes (precio público del proveedor) | F1–F4 (sem. 3–7) | La plataforma no ofrece copias inmutables de forma nativa | Efeonce / Fiordo Austral | [S12], [S22] |
| 10 | Política de retención definida | Cumple parcialmente | Parcial | Retención propia en el destino del respaldo, a acordar con Fiordo Austral. Por ejemplo: copias diarias por 12 meses y mensuales por 7 años | Almacenamiento a cargo de Fiordo Austral | F1 (sem. 3–4) | La retención interna de HubSpot no es configurable por el cliente: papelera de 90 días y reversión de cambios de hasta 14 días | Efeonce / Fiordo Austral | [S13], [S14], [S20] |
| 11 | Pruebas periódicas de restauración | Requiere desarrollo | No | Restauración de prueba en una cuenta de pruebas de HubSpot separada de producción, sin datos reales de clientes. Se hace antes de producción y luego cada trimestre, con conciliación de conteos y acta | Incluido en implementación y soporte de Efeonce | F5 (sem. 9–10) y trimestral | La edición Professional no incluye sandbox estándar. La restauración se realiza por importación o API; no existe una restauración nativa «en un clic» desde el archivo | Efeonce | [S11], [S12] |
| 12 | Procedimientos documentados de recuperación | Requiere desarrollo | No | Manual de recuperación de Efeonce: papelera, reversión de cambios, restauración desde el respaldo y escalamiento a HubSpot | Incluido en la oferta de Efeonce | F1–F5 (sem. 4–10) | — | Efeonce | [S13], [S14] |

### 5.3 Registros de auditoría

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | Registro de accesos y autenticaciones | Cumple | Sí | Historial de inicios de sesión y API de inicios de sesión (90 días), con envío a Wazuh (ítem 61) | Sin costo adicional | F1 (sem. 3) | La interfaz conserva 30 días; la retención de largo plazo se resuelve en Wazuh | HubSpot / Efeonce | [S7], [S8] |
| 14 | Registro de cambios de configuración | Cumple parcialmente | Sí | Historial de actividad de seguridad con envío a Wazuh. Registro de cambios de configuración funcional en la bitácora de cambios de Efeonce | Sin costo adicional | F1 (sem. 3) | En la edición Professional, el registro de la cuenta se filtra por inicios de sesión y actividad de seguridad. Las categorías ampliadas de auditoría son de la edición Enterprise | HubSpot / Efeonce | [S7] |
| 15 | Registro de creación, modificación y eliminación de información | Cumple parcialmente | Parcial | Historial de propiedades en cada registro, con usuario, fecha y valor anterior. Además, exportaciones programadas vía API del CRM y comparación entre exportaciones sucesivas para detectar altas, cambios y eliminaciones, con envío de las diferencias a Wazuh | Desarrollo incluido en la oferta de Efeonce | F1–F4 (sem. 3–7) | La edición Professional no incluye la API de registro de auditoría de acciones de usuario. La detección por comparación de exportaciones opera con la frecuencia del proceso, no en tiempo real | HubSpot / Efeonce | [S7], [S8], [S12] |
| 16 | Registro de exportación y descarga de información | Cumple parcialmente | Sí | Notificaciones de exportación y envío a Wazuh de los eventos de actividad de seguridad | Sin costo adicional | F1 (sem. 3) | El nivel de detalle del registro de descargas individuales se validará en la prueba técnica | HubSpot / Efeonce | [S7] |
| 17 | Identificación del usuario, fecha, hora, origen y resultado de la acción | Cumple parcialmente | Sí | Normalización de los campos en el colector hacia Wazuh | Incluido en la oferta de Efeonce | F1–F4 | Los eventos traen usuario, fecha y hora, acción, objeto y ubicación aproximada. El campo «resultado» explícito por evento se validará en la prueba técnica | HubSpot / Efeonce | [S7] |
| 18 | Registros protegidos contra alteración | Cumple parcialmente | Parcial | Copia en Wazuh como registro de custodia de Fiordo Austral, con sus controles de integridad | Sin costo adicional de licencia | F1–F4 (sem. 3–7) | Los usuarios no pueden editar los registros, pero HubSpot no publica una declaración formal de inalterabilidad | HubSpot / Fiordo Austral | [S7] |
| 19 | Registros disponibles para revisión y exportación | Cumple parcialmente | Sí | Exportación por interfaz (Super Admin). API de inicios de sesión y de actividad de seguridad. Consulta consolidada en Wazuh | Sin costo adicional | F1 (sem. 3) | La API de registro de auditoría completa es de la edición Enterprise | HubSpot / Efeonce | [S7], [S8] |

### 5.4 Roles y cuentas compartidas

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Indicar los roles estándar disponibles | Cumple | Sí | Super Admin y permisos por herramienta y por usuario. La matriz de roles propuesta se entrega en F0 | Sin costo adicional | F0 (sem. 1–2) | — | Efeonce | [S9] |
| 21 | Posibilidad de crear roles personalizados | Cumple parcialmente | Sí | Roles personalizados definidos como plantillas de permisos documentadas y aplicadas por usuario | Sin costo adicional | F1 (sem. 2–3) | La edición Professional no permite guardar conjuntos de permisos reutilizables; las plantillas se aplican y revisan manualmente | Efeonce | [S9] |
| 22 | Mecanismos para evitar cuentas compartidas | Cumple | Sí | Licencias nominativas, SSO con Entra ID, SCIM y política de prohibición de cuentas genéricas | Sin costo adicional | F1 (sem. 2) | — | Fiordo Austral / Efeonce | [S1], [S2] |
| 23 | Sesión única: no se permite multisesión | Requiere desarrollo | No | HubSpot no ofrece un control nativo de sesiones concurrentes. Control compensatorio: (1) control de sesión de Entra ID mediante Defender for Cloud Apps; (2) frecuencia de inicio de sesión acotada en Entra ID y tiempo de inactividad corto en HubSpot; (3) regla en Wazuh que detecta sesiones simultáneas desde dispositivos o direcciones distintas, con cierre remoto de todas las sesiones del usuario | Licencia Defender for Cloud Apps de Fiordo Austral, a confirmar. Configuración y regla incluidas en la oferta de Efeonce | F1 (sem. 3–4) | Es un control compensatorio, no nativo. La aplicación móvil mantiene la sesión hasta 30 días; se acota con las políticas de Entra ID y de dispositivos | Fiordo Austral / Efeonce | [S6], [S7] |

### 5.5 Seguridad de los datos

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | Cifrado en tránsito | Cumple | Sí | — | Sin costo adicional | — | Conexiones HTTPS con TLS 1.2 y 1.3 obligatorias | HubSpot | [S16], [S20] |
| 25 | Cifrado en reposo | Cumple | Sí | — | Sin costo adicional | — | HubSpot declara cifrado en reposo por capas. El algoritmo específico se acredita con el informe SOC 2 Type II | HubSpot | [S16] |
| 26 | Separación lógica entre clientes | Cumple parcialmente | Sí | — | Sin costo adicional | — | Plataforma multiinquilino. La segregación se acredita con el informe SOC 2 Type II, entregable bajo acuerdo de confidencialidad | HubSpot | [S16], [S19] |
| 27 | Controles contra acceso no autorizado | Cumple | Sí | SSO, MFA, restricción por IP de confianza y por ubicación aprobada, y permisos | Sin costo adicional | F1 (sem. 2–3) | — | HubSpot / Fiordo Austral | [S1], [S3], [S5] |
| 28 | Prevención de fuga de información | Cumple parcialmente | Parcial | Restricción de permisos de exportación y notificaciones de exportación. Bloqueo de descargas en sesión mediante Defender for Cloud Apps | Licencia Defender for Cloud Apps de Fiordo Austral, a confirmar | F1 (sem. 3–4) | HubSpot no incorpora una solución propia de prevención de pérdida de datos (DLP), y la edición Professional no incluye Datos Sensibles | Fiordo Austral / Efeonce | [S10] |
| 29 | Clasificación y retención de datos | Requiere desarrollo | No | Matriz de clasificación por propiedad y por proceso, con grupos de propiedades y visibilidad por equipo. Retención aplicada por procedimiento de depuración periódica documentado | Incluido en la oferta de Efeonce | F2 (sem. 3–6) | La edición Professional no permite marcar propiedades como sensibles, y la plataforma no aplica políticas automáticas de retención por objeto | Efeonce / Fiordo Austral | [S10] |
| 30 | Eliminación segura al término del servicio | Cumple | Sí | Solicitud de certificado de borrado al término | Sin costo adicional | Al término | Los respaldos archivados de la plataforma se eliminan conforme a las prácticas de HubSpot | HubSpot | [S16] |
| 31 | Restricción de exportaciones masivas | Cumple parcialmente | Sí | Permiso de exportación reservado a administradores y alertas de exportación hacia Wazuh | Sin costo adicional | F1 (sem. 3) | La restricción se gestiona por usuario y se valida en la prueba técnica | Efeonce / Fiordo Austral | [S7], [S9] |
| 32 | Informar ubicación y jurisdicción de almacenamiento | Cumple | Sí | Elección del centro de datos antes del alta: Unión Europea (Alemania) o Estados Unidos | Sin costo adicional | Antes del alta | No existe región de alojamiento en Chile ni en Latinoamérica | HubSpot / Fiordo Austral | [S15] |
| 33 | Informar los subencargados que procesan información | Cumple | Sí | Se adjunta la lista vigente publicada por HubSpot | Sin costo adicional | — | La lista incluye proveedores de inteligencia artificial. Las funciones de IA pueden deshabilitarse si Fiordo Austral lo requiere | HubSpot | [S18] |
| 34 | Mecanismos de portabilidad y devolución de datos | Cumple | Sí | Plan de salida en el manual de operación | Sin costo adicional | — | — | HubSpot / Efeonce | [S16] |
| 35 | Medidas aplicables a dispositivos móviles | Cumple parcialmente | Parcial | SSO y MFA en la aplicación móvil, restricción por IP también aplicable al móvil y Acceso Condicional con dispositivo administrado | Licencias Intune y Entra ID de Fiordo Austral, a confirmar | F1 (sem. 3–4) | La aplicación mantiene la sesión hasta 30 días. La compatibilidad con las políticas de protección de aplicaciones de Intune se validará en la prueba técnica | Fiordo Austral / Efeonce | [S5], [S6] |

### 5.6 Gestión de vulnerabilidades

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | Programa documentado de gestión de vulnerabilidades: inventario, análisis periódicos, pentest independiente, dependencias, configuraciones y parches | Cumple | Sí | — | Sin costo adicional | — | El detalle de inventario y dependencias se acredita con el informe SOC 2 Type II | HubSpot | [S16], [S19] |
| 37 | Plazos máximos de remediación según criticidad | Cumple parcialmente | Sí | Solicitud formal a HubSpot vía canal partner. Los componentes desarrollados por Efeonce se remedian según el SLA de soporte | Sin costo adicional | F0 | HubSpot no publica plazos por criticidad | HubSpot / Efeonce | [S16] |
| 38 | Procedimiento para vulnerabilidades sin parche | Cumple parcialmente | Sí | Solicitud formal a HubSpot; procedimiento propio de Efeonce para sus componentes | Sin costo adicional | F0 | No publicado por HubSpot | HubSpot / Efeonce | [S16] |
| 39 | Comunicación de riesgos relevantes | Cumple | Sí | Suscripción del equipo de TI a la página de estado de HubSpot. Efeonce informa los riesgos que afecten la configuración | Sin costo adicional | F6 | — | HubSpot / Efeonce | [S16], [S23] |
| 40 | Entrega de evidencia o informes ejecutivos de las evaluaciones | Cumple | Sí | Resúmenes de pentest, entregables bajo acuerdo de confidencialidad; SOC 3 público | Sin costo adicional | F0 | — | HubSpot | [S16], [S19] |

### 5.7 Desarrollo seguro, integraciones y cambios

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 41 | Prácticas de desarrollo seguro en aplicaciones web, móviles, interfaces y API | Cumple parcialmente | Sí | Los componentes propios de Efeonce (colector Wazuh, respaldo, integración QAD) se desarrollan con revisión de código, validación de entradas, gestión segura de secretos y cifrado de comunicaciones | Incluido en la oferta de Efeonce | F1–F4 | La práctica de HubSpot se acredita con su programa de seguridad y el informe SOC 2 Type II | HubSpot / Efeonce | [S19] |
| 42 | Autenticación y autorización por cada integración, y limitación de solicitudes | Cumple | Sí | Una aplicación OAuth o privada por integración, con alcances mínimos. La plataforma aplica límites de solicitudes | Sin costo adicional | F4 (sem. 6–8) | — | HubSpot / Efeonce | [S8] |
| 43 | Integraciones con Outlook, Teams, SharePoint y OneDrive con permisos mínimos, credenciales no compartidas, registro de actividad y revocación | Cumple parcialmente | Sí | Consentimiento administrativo en Entra ID para las aplicaciones de Microsoft; revisión y revocación desde Entra ID y HubSpot | Sin costo adicional | F4 (sem. 6–8) | Los alcances los define cada aplicación oficial; se revisarán y aprobarán con TI antes de activarlas | Fiordo Austral / Efeonce | [S21] |
| 44 | Integración con QAD con permisos mínimos, credenciales propias, registro y revocación | Requiere desarrollo | No | Integración a medida vía API de QAD y de HubSpot, con credencial dedicada, registro de actividad y revocación | Se cotiza por separado según la versión y API de QAD (integración deseable, no excluyente) | Factibilidad en F4; construcción posterior | No existe un conector nativo HubSpot–QAD | Efeonce / Fiordo Austral | [S8] |
| 45 | Proceso de gestión de cambios | Cumple parcialmente | Sí | Flujo de cambios de Efeonce: solicitud documentada, prueba con registros de prueba o en la cuenta de pruebas, lista de verificación, aprobación y activación en producción con registro | Incluido en la oferta de Efeonce | F1 | Sin sandbox estándar, los cambios de configuración se validan por procedimiento y no en una copia sincronizada de producción | Efeonce | [S11] |
| 46 | Ambientes separados de desarrollo, pruebas y producción | Cumple parcialmente | Parcial | Cuenta de pruebas de HubSpot separada de producción para validar integraciones, automatizaciones y restauraciones. Configuración controlada en producción | Incluido en la oferta de Efeonce | F1 (sem. 2–3) | La edición Professional no incluye el sandbox estándar, que replica la configuración de producción; la cuenta de pruebas se configura y mantiene por separado | HubSpot / Efeonce | [S11] |

### 5.8 Disponibilidad y continuidad

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 47 | Alta disponibilidad, redundancia de componentes críticos, monitoreo continuo y plan probado de continuidad y recuperación | Cumple | Sí | — | Sin costo adicional | — | Arquitectura distribuida con réplicas en múltiples centros de datos y respaldos frecuentes | HubSpot | [S20] |
| 48 | Disponibilidad mensual comprometida | Cumple parcialmente | Sí | — | Sin costo adicional | — | HubSpot declara 99,95 % mensual como compromiso de esfuerzo comercialmente razonable, no como garantía firme | HubSpot | [S17] |
| 49 | Exclusiones del SLA | Cumple | Sí | — | Sin costo adicional | — | Excluye fuerza mayor, terceros, mal uso y mantenimiento | HubSpot | [S17] |
| 50 | Tiempo objetivo de recuperación (RTO) y punto objetivo de recuperación (RPO) | No cumple | — | Solicitud de declaración escrita a HubSpot. Efeonce compromete RTO y RPO para su capa en el SLA de soporte | Sin costo adicional | F0 | HubSpot no publica RTO ni RPO | HubSpot / Efeonce | [S20] |
| 51 | Ventanas de mantenimiento | No cumple | — | Solicitud de información a HubSpot. Los mantenimientos de Efeonce se coordinan con aviso previo | Sin costo adicional | F0 | Las ventanas no se publican y quedan a criterio de HubSpot | HubSpot / Efeonce | [S17] |
| 52 | Arquitectura de redundancia | Cumple | Sí | — | Sin costo adicional | — | — | HubSpot | [S15], [S20] |
| 53 | Frecuencia de pruebas de continuidad | Cumple parcialmente | Sí | Solicitud a HubSpot. Las pruebas de restauración de Efeonce son trimestrales (ítem 11) | Sin costo adicional | Trimestral | La frecuencia no se publica; se acredita con el informe SOC 2 Type II | HubSpot / Efeonce | [S19] |
| 54 | Compensaciones por incumplimiento | Cumple parcialmente | Sí | — | Sin costo adicional | — | Crédito prorrateado solo si el incumplimiento se repite dos o más meses consecutivos | HubSpot | [S17] |
| 55 | Historial reciente de disponibilidad del servicio | Cumple | Sí | Se adjunta el historial publicado en la página de estado | Sin costo adicional | — | — | HubSpot | [S23] |

### 5.9 Incidentes y evidencias

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 56 | Monitoreo de seguridad, detección y respuesta, escalamiento y canal permanente para eventos críticos | Cumple | Sí | Mesa de soporte de Efeonce con guardia permanente para incidentes críticos de seguridad, y escalamiento a HubSpot y Microsoft | Incluido en soporte de Efeonce | F6 | — | HubSpot / Efeonce | [S16], [S19] |
| 57 | Notificación oportuna, preservación de evidencias, informe de alcance, contención y causa raíz; tiempos por severidad | Cumple parcialmente | Sí | Efeonce compromete tiempos por severidad para su servicio: respuesta en ≤ 1 h en severidad crítica e informe de causa raíz en ≤ 5 días hábiles | Incluido en soporte de Efeonce | F6 | HubSpot notifica brechas de datos personales sin demora indebida y a más tardar en 72 horas; no publica tiempos por severidad | HubSpot / Efeonce | [S16] |
| 58 | Certificaciones o informes de auditoría independiente | Cumple | Sí | Entrega de SOC 3 y, bajo acuerdo de confidencialidad, de SOC 2 Type II | Sin costo adicional | F0 | HubSpot no declara certificación ISO 27001 propia. El proveedor de infraestructura (AWS) sí cuenta con ISO 27001 y SOC 2 | HubSpot | [S15], [S19] |
| 59 | Políticas de seguridad, privacidad y gestión de terceros | Cumple | Sí | Se adjuntan el DPA, la política de seguridad y la lista de subencargados | Sin costo adicional | — | — | HubSpot | [S16], [S18], [S19] |
| 60 | Capacitación del personal del proveedor y antecedentes del centro de datos | Cumple parcialmente | Sí | — | Sin costo adicional | — | Los antecedentes del centro de datos están acreditados (AWS). La capacitación del personal de HubSpot se acredita con el informe SOC 2 Type II | HubSpot | [S15], [S19] |

### 5.10 Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft

| N.º | Requisito | Estado | Incluido en licencia | Configuración adicional | Costo asociado | Plazo | Limitaciones | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | Integración mediante conector o API con el SIEM Wazuh | Requiere desarrollo | Parcial: API de inicios de sesión y de actividad de seguridad incluidas | Colector desarrollado por Efeonce que (1) consulta periódicamente las API de inicios de sesión y de actividad de seguridad de HubSpot, (2) agrega las diferencias detectadas en las exportaciones programadas del CRM (ítem 15), (3) normaliza los eventos y (4) los entrega a Wazuh por syslog o por un archivo leído por su agente, con decodificadores y reglas de detección. Los registros de Entra ID se envían a Wazuh por su integración con Microsoft | Desarrollo incluido en la oferta de Efeonce. El alojamiento del colector, en infraestructura de Fiordo Austral o de Efeonce, está por definir | F1–F4 (sem. 3–7) | No existe un conector nativo. En la edición Professional no hay API de registro de auditoría de acciones de usuario, por lo que las acciones sobre datos llegan por comparación de exportaciones, con latencia de minutos u horas según la frecuencia acordada | Efeonce / Fiordo Austral | [S8] |
| 62 | Aplicaciones empresariales con permisos mínimos y consentimiento administrativo controlado | Cumple parcialmente | Sí | Consentimiento administrativo obligatorio en Entra ID y alcances mínimos en las aplicaciones privadas de HubSpot | Sin costo adicional | F1 (sem. 2–3) | Los alcances de las aplicaciones oficiales los define cada fabricante | Fiordo Austral / Efeonce | [S21] |
| 63 | No usar secretos permanentes cuando exista autenticación por certificado, identidad administrada o federación | Requiere desarrollo | Parcial | Usuarios: autenticación federada (SAML con Entra ID). Integraciones: tokens guardados en Azure Key Vault con rotación periódica, o aplicación OAuth con tokens de refresco | Incluido en la oferta de Efeonce; Key Vault en la suscripción de Fiordo Austral | F1–F4 | La API de HubSpot no admite autenticación por certificado | Efeonce / Fiordo Austral | [S8] |
| 64 | Revisar, revocar y auditar permisos, tokens y consentimientos | Cumple parcialmente | Sí | Revisión trimestral de accesos, aplicaciones y consentimientos, con apoyo del historial de actividad de seguridad y de Entra ID | Incluido en soporte de Efeonce | Continuo | En la edición Professional, la auditoría de cambios de permisos se apoya en la actividad de seguridad y no en el registro de auditoría ampliado | Fiordo Austral / Efeonce | [S7], [S8] |
| 65 | Arquitectura Zero Trust: verificación explícita de cada acceso según identidad, riesgo, dispositivo, ubicación, sensibilidad y sesión | Cumple parcialmente | Parcial | Políticas de Acceso Condicional en Entra ID diseñadas con TI, y restricción por IP y por ubicación en HubSpot | Licencias Entra ID P1/P2, Intune y Defender for Cloud Apps de Fiordo Austral, a confirmar | F1 (sem. 2–4) | La evaluación por riesgo, dispositivo y sesión depende de las licencias Microsoft disponibles. La sensibilidad por campo no está disponible en la edición Professional | Fiordo Austral / Efeonce | [S5], [S21] |
| 66 | Cifrado TLS 1.2 o superior en tránsito | Cumple | Sí | — | Sin costo adicional | — | — | HubSpot | [S20] |
| 67 | AES-256 o equivalente en reposo | Cumple parcialmente | Sí | Confirmación del algoritmo con el informe SOC 2 Type II | Sin costo adicional | F0 | El algoritmo no se publica en la documentación abierta | HubSpot | [S16] |
| 68 | Administración segura y rotación de claves | Cumple parcialmente | Sí | — | Sin costo adicional | — | Las claves las gestionan HubSpot y su proveedor de infraestructura; no se ofrecen claves administradas por el cliente | HubSpot | [S16] |
| 69 | Respaldo cifrado e inmutable | Requiere desarrollo | No | Ver ítems 7, 8 y 9 | Ver ítems 7, 8 y 9 | F1–F4 | — | Efeonce / Fiordo Austral | [S12], [S22] |
| 70 | Declaración de regiones de almacenamiento, procesamiento, respaldo y recuperación | Cumple | Sí | Declaración escrita según el centro de datos elegido | Sin costo adicional | Antes del alta | La recuperación ante desastres opera dentro de la región elegida. Algunos procesamientos (soporte, IA) pueden ocurrir fuera de ella | HubSpot | [S15], [S18] |
| 71 | SLA mensual ≥ 99,9 %, monitoreo permanente, pruebas anuales de continuidad, respaldo geográficamente separado y evidencia de restauraciones exitosas | Cumple parcialmente | Sí | Las restauraciones trimestrales de Efeonce constituyen la evidencia de restauración para Fiordo Austral | Incluido en soporte de Efeonce | Trimestral | Ver ítems 48, 50 y 53 | HubSpot / Efeonce | [S17], [S20] |
| 72 | MFA resistente al phishing y Acceso Condicional | Cumple | Sí en HubSpot; requiere Entra ID P1 | Política de Acceso Condicional para la aplicación HubSpot con «Authentication strength» resistente al phishing (FIDO2, Windows Hello o passkeys) | Licencia Entra ID P1 de Fiordo Austral, a confirmar | F1 (sem. 2) | — | Fiordo Austral / Efeonce | [S1], [S3] |
| 73 | Gestión de privilegios | Cumple parcialmente | Sí en HubSpot; PIM requiere Entra ID P2 | Super Admin mínimo, permisos por usuario según la matriz de roles y activación just-in-time del rol de administrador mediante PIM | Licencia Entra ID P2 de Fiordo Austral, a confirmar | F1 (sem. 2–3) | La edición Professional no incluye conjuntos de permisos; los privilegios se asignan y revisan por usuario | Fiordo Austral / Efeonce | [S9] |
| 74 | Indicar las licencias Microsoft y del CRM requeridas, costos adicionales, limitaciones y evidencias de configuración | Cumple | — | Ver sección 6.2 | Ver oferta económica | F0 | — | Efeonce | — |

---

## 6. Requisitos obligatorios de aceptación antes de producción

### 6.1 Cómo se demostrará cada requisito en la prueba técnica

La prueba técnica se ejecutará en la fase F5 (semanas 9 y 10).
- **Quién la ejecuta:** Efeonce, junto con el equipo de TI de Fiordo Austral.
- **Dónde:** en el portal de producción ya configurado, antes de habilitar a los usuarios. Las restauraciones se prueban en la cuenta de pruebas.
- **Evidencia:** cada prueba deja un acta.

| Requisito | Demostración en la prueba técnica | Evidencia entregada |
| --- | --- | --- |
| Integración con Entra ID | Inicio de sesión de un usuario de prueba por SSO; un intento de acceso con usuario y contraseña es rechazado | Capturas de la configuración SAML y registro de inicios de sesión |
| MFA resistente al phishing | Inicio de sesión que exige un método resistente al phishing; un intento con un método débil es rechazado | Política de Acceso Condicional exportada y registro de Entra ID |
| Acceso Condicional | Un acceso desde un dispositivo o ubicación no autorizados es bloqueado | Registro de inicios de sesión de Entra ID |
| Administración de usuarios | Alta, cambio de perfil y baja de un usuario desde Entra ID mediante SCIM, reflejados en HubSpot; verificación de los permisos aplicados según la plantilla del perfil | Registro de aprovisionamiento y matriz de roles verificada |
| Gestión de privilegios | Verificación de la matriz de roles por usuario y del número de Super Admin; activación del privilegio de administrador vía PIM, si aplica | Matriz de roles y registro de actividad de seguridad |
| Registro hacia SIEM | Generación de eventos de prueba (inicio de sesión, cambio de seguridad, exportación, creación y eliminación de un registro de prueba) y verificación de su llegada a Wazuh. Los eventos de datos llegan por comparación de exportaciones | Consulta en Wazuh con los eventos recibidos y sus tiempos |
| Sesión única | Inicio de sesión simultáneo desde dos dispositivos: alerta en Wazuh y cierre remoto de sesiones | Alerta de Wazuh y registro de cierre de sesiones |
| Cifrado | Verificación de TLS en las conexiones y del cifrado del almacenamiento de respaldo | Informe de conexión y configuración; SOC 2 Type II bajo acuerdo de confidencialidad |
| Auditoría | Consulta y exportación del historial de inicios de sesión y de actividad de seguridad; revisión del historial de propiedades de los registros modificados en la prueba | Archivos exportados y capturas del historial |
| Respaldo probado | Ejecución del respaldo diario de Efeonce, verificación de la copia inmutable y restauración en la cuenta de pruebas con conciliación de conteos | Acta de restauración con conteos |
| Recuperación | Recuperación de un registro eliminado desde la papelera y reversión de un cambio masivo de prueba | Acta y historial del registro |
| Parches y actualizaciones | Revisión del procedimiento de actualización de los componentes de Efeonce y de la página de estado de HubSpot | Procedimiento documentado |
| Respuesta a incidentes | Simulacro de un incidente de severidad crítica: aviso, escalamiento, contención y registro | Acta del simulacro con tiempos |
| Alta disponibilidad | Revisión de la arquitectura de redundancia y del historial de disponibilidad publicados por HubSpot | Documentación oficial adjunta |

### 6.2 Licencias requeridas

**Licencias del CRM**
- HubSpot Sales Hub Professional, 10 licencias (ver oferta económica).

**Licencias Microsoft que podrían requerirse.** Se confirmarán con Fiordo Austral según lo que ya tenga contratado (por ejemplo Microsoft 365 E3, E5 o Business Premium):

| Licencia | Para qué se usa | Estado |
| --- | --- | --- |
| Microsoft Entra ID P1 | Acceso Condicional, bloqueo de autenticación heredada y MFA resistente al phishing | A confirmar con Fiordo Austral |
| Microsoft Entra ID P2 | Evaluación por riesgo de inicio de sesión y Privileged Identity Management (PIM) | A confirmar con Fiordo Austral |
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

---

**Opción Sales Hub Enterprise.** Si Fiordo Austral lo prefiere, la edición Sales Hub Enterprise agrega de forma nativa:
- API de auditoría completa;
- sandbox estándar;
- conjuntos de permisos;
- permisos por campo;
- respaldo diario programado.

Ver la oferta económica.
