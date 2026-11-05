# Matriz de cumplimiento de ciberseguridad — HubSpot vs bases Fiordo Austral (Wherex 428823)

> **Tipo:** documento interno de trabajo (borrador). No es la matriz que se entrega al comprador.
> **Fecha de consulta de fuentes:** 05/11/2026. Fuentes oficiales de HubSpot y Microsoft, leídas en esa fecha.
> **Alcance:** sección 4 de las bases («Cyberseguridad»), incluido el bloque «Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft» y los obligatorios de aceptación.
> **Ediciones evaluadas:** Sales Hub Professional y Sales Hub Enterprise.

## Cómo leer esta matriz

- **Estado:** C = cumple · CP = cumple parcialmente · NC = no cumple · RD = requiere desarrollo o un control compensatorio.
- **Marcas de evidencia:**
  - **[V]** verificado en una fuente oficial leída hoy.
  - **[I]** inferido. No aparece en una fuente oficial leída; queda pendiente de confirmar con HubSpot (PDM o especialista en crecimiento) o con Microsoft.
- **Responsable:**
  - HS = HubSpot (plataforma).
  - FA = Fiordo Austral (tenant Entra, Microsoft 365, SIEM).
  - EF = Efeonce (implementación y operación).
  - 3P = tercero (app del marketplace).
- **Plazo:** estimación propia [I] dentro del proyecto de implementación. No es un compromiso de HubSpot.
- **Sin precios de HubSpot:** no se inventan. Cuando hay un add-on de tercero, se cita su precio público de lista.

## Fuentes oficiales usadas (consulta 05/11/2026)

| # | Fuente | Fecha del documento |
| --- | --- | --- |
| S1 | [Set up single sign-on (SSO)](https://knowledge.hubspot.com/account-security/set-up-single-sign-on-sso) | Actualizado el 05/08/2026 |
| S2 | [Provision users with SCIM](https://knowledge.hubspot.com/account-security/provision-hubspot-users-with-scim-through-google) (incluye SCIM custom para Entra) | 30/09/2026 |
| S3 | [Set up 2FA](https://knowledge.hubspot.com/account-security/set-up-two-factor-authentication-for-your-hubspot-login) | 16/10/2026 |
| S4 | [Restrict login methods](https://knowledge.hubspot.com/account-security/restrict-which-login-methods-users-can-use-to-access-your-account) | 13/07/2026 |
| S5 | [Manage login and account access settings](https://knowledge.hubspot.com/account-security/limit-logins-to-trusted-ip-addresses) (IP y ubicaciones) | 22/09/2026 |
| S6 | [Log out of HubSpot](https://knowledge.hubspot.com/account-management/log-out-of-hubspot) (timeout de sesión y cierre remoto de sesiones) | 23/02/2026 |
| S7 | [View and export account activity history](https://knowledge.hubspot.com/account-management/view-and-export-account-activity-history) (audit logs) | 30/10/2026 |
| S8 | [Account activity API](https://developers.hubspot.com/docs/api-reference/account-audit-logs-v3/guide) | Consultado el 05/11/2026 |
| S9 | [Manage user permissions](https://knowledge.hubspot.com/user-management/manage-user-permissions) (permission sets) | 03/11/2026 |
| S10 | [Store Sensitive Data](https://knowledge.hubspot.com/account-security/store-sensitive-data) | 05/11/2026 |
| S11 | [Standard sandbox](https://knowledge.hubspot.com/account-management/set-up-a-hubspot-standard-sandbox-account) | 28/10/2026 |
| S12 | [Back up CRM data](https://knowledge.hubspot.com/object-settings/back-up-crm-data) | 04/06/2026 |
| S13 | [Restore CRM changes](https://knowledge.hubspot.com/object-settings/restore-crm-changes) | 13/10/2026 |
| S14 | [Restore deleted records](https://knowledge.hubspot.com/records/restore-deleted-records) | 07/10/2026 |
| S15 | [Cloud infrastructure and data hosting FAQ](https://knowledge.hubspot.com/account-security/hubspot-cloud-infrastructure-and-data-hosting-frequently-asked-questions) | 24/07/2026 |
| S16 | [HubSpot DPA](https://legal.hubspot.com/dpa) | Modificado el 16/09/2026 |
| S17 | [Product Specific Terms §9 Service Uptime Commitment](https://legal.hubspot.com/product-specific-terms) | Modificado el 16/09/2026 |
| S18 | [Sub-processors](https://legal.hubspot.com/sub-processors-page) | Consultado el 05/11/2026 |
| S19 | [Security and Compliance](https://www.hubspot.com/security-and-compliance) | Consultado el 05/11/2026 |
| S20 | [Reliability](https://www.hubspot.com/reliability) | Sin fecha visible; tiene datos de hosting anteriores a S15 |
| S21 | [Microsoft Entra: HubSpot SSO tutorial](https://learn.microsoft.com/en-us/entra/identity/saas-apps/hubspot-tutorial) | ms.date 25/03/2025 |
| S22 | [ProBackup (marketplace)](https://ecosystem.hubspot.com/marketplace/listing/pro-backup-380854) y [SysCloud Backup (marketplace)](https://ecosystem.hubspot.com/marketplace/listing/syscloud-backup-for-hubspot-595013) | Listados del proveedor |
| S23 | [status.hubspot.com](https://status.hubspot.com/) (historial de incidentes) | Consultado el 05/11/2026 |

## Hechos clave verificados

Todos son **[V]** salvo los dos marcados al final.

- **SSO SAML:** Professional y Enterprise. Requiere Super Admin. Para Entra, se instala la app de HubSpot del Azure Marketplace o galería y se apaga la opción legacy de AD FS. Se puede **exigir SSO** a todos los usuarios con excepciones. Fuentes: S1, S19, S21.
- **SCIM:** Professional y Enterprise. Para Entra se usa SCIM custom, con un solo IdP. Fuente: S2. El tutorial de Microsoft (S21, de 2025) dice que el aprovisionamiento es manual; S2 es más reciente y prevalece.
- **2FA:** obligatorio para todos los usuarios que entran con usuario y contraseña en Starter, Professional y Enterprise. Métodos disponibles: passkeys, app autenticadora y SMS. Se pueden restringir los métodos. Fuente: S3.
- **Métodos de login:** se pueden restringir (Google, Microsoft, Apple, passkey, email y contraseña) en todos los planes. Fuente: S4.
- **Acceso por red y ubicación:** restricción por IP confiable y por ubicación aprobada en Starter y superiores. La restricción por IP aplica también al móvil. Fuente: S5.
- **Sesión:**
  - El timeout de inactividad es configurable; por defecto son 24 h.
  - Con «Remember me» la sesión dura 28 días.
  - Existe «Log Out of All Sessions» y el cierre remoto de sesiones individuales. Fuente: S6.
  - En la app móvil la sesión dura 30 días. Fuente: S7.
  - **No hay control oficial para limitar sesiones concurrentes.** Ninguna fuente lo menciona.
- **Audit logs:**
  - UI con 30 días de historial (All Logs, Login History, Security Activity), solo para Super Admin.
  - Professional filtra únicamente por Login y Security Activity. **Enterprise** suma categorías (Approval, Content, Workflows y más) y metadata adicional. Fuente: S7.
  - **El endpoint de audit log de acciones de usuario por API es solo Enterprise.** Los endpoints de login (90 días) y de security history existen aparte. Fuente: S8.
- **Permisos:** los permisos granulares por usuario están en todos los planes. **Crear y editar permission sets requiere Enterprise.** Fuente: S9.
- **Sensitive Data:** permisos de campo, cifrado a nivel de aplicación y property audit log. **Solo Enterprise.** Fuentes: S10, S19.
- **Sandbox estándar:** **solo Enterprise.** Fuente: S11.
- **Backup:**
  - Starter y Professional: backup semanal manual.
  - **Enterprise:** backup cada 24 h y **backups recurrentes programados**.
  - Incluye contactos, empresas, negocios, tickets, objetos custom, productos, llamadas, conversaciones y tareas. No incluye asociaciones ni actividades. Se descarga en un plazo de 14 días. Fuente: S12.
  - «Restore CRM changes» permite volver hasta 14 días atrás (Starter y superiores). Fuente: S13.
  - La papelera conserva lo eliminado 90 días. Fuente: S14.
- **Hosting:**
  - AWS en EE. UU. (East/West), Canadá, Australia y UE (Alemania).
  - La replicación para DR y backup se hace dentro de la región elegida.
  - El data center se puede cambiar en planes pagos. Fuente: S15.
  - **Chile no tiene región propia.**
- **ISO 27001:** **HubSpot no está certificado.** AWS sí tiene ISO 27001 y SOC 2 Type 2. Fuente: S15.
- **SOC y pentest:**
  - SOC 2 Type II y SOC 3 en el Trust Center. El SOC 3 se entrega sin NDA. Fuente: S19.
  - Pentest anual por terceros. El reporte SOC 2 y los resúmenes de pentest se entregan bajo confidencialidad, a pedido. Fuente: S16.
  - Bug bounty en Bugcrowd. Fuente: S19.
- **Incidentes:** notificación de brecha de datos personales «sin demora indebida y a más tardar en 72 horas». HubSpot mantiene un registro de incidentes. Fuente: S16.
- **Término del servicio:** HubSpot borra o devuelve los datos según las Product Specific Terms. Lo archivado en backups queda aislado hasta su borrado. Fuente: S16.
- **Cifrado:**
  - HTTPS/TLS obligatorio y cifrado en reposo «por capas». Fuente: S16.
  - TLS 1.2 y 1.3 con llaves de 2048 bits. Fuente: S20.
  - **AES-256 no aparece explícito** en las fuentes leídas.
- **SLA (S17 §9):**
  - «Esfuerzos comercialmente razonables» para **99,95 %** mensual.
  - Exclusiones: fuerza mayor, terceros, mal uso y **mantenimiento a discreción de HubSpot**.
  - Única compensación: un crédito prorrateado **solo si se incumple dos o más meses consecutivos**.
  - No publica RTO, RPO ni ventanas de mantenimiento.
- **Resiliencia (S20):**
  - Réplica en 3 data centers.
  - Backups horarios y diarios con retención de 30 días.
  - Un subconjunto crítico se respalda en otra región geográfica.
  - Los snapshots permiten recuperar «en minutos».
- **Subencargados (S18):** AWS y Google (infraestructura), Cloudflare y proveedores de IA como OpenAI, entre otros.
- **Wazuh:** **no existe un conector nativo HubSpot ↔ Wazuh.** El patrón documentado por otros proveedores es un *poller* de API que entrega JSON a Wazuh por syslog o archivo, con decoders y reglas propias. Esto es **[I]** para HubSpot.
- **Respaldo inmutable:**
  - **No es nativo.** Existen apps del marketplace con snapshots independientes: ProBackup, con snapshot diario cifrado en AWS, versiones separadas y desde USD 25 al mes; y SysCloud, desde USD 29 por usuario al año. Fuente: S22, según la publicación de cada proveedor.
  - Ninguna de las dos declara «inmutable» en su ficha.

## A. Control de acceso

| ID | Requisito (bases) | Pro | Ent | ¿En licencia? | Configuración adicional | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Control de acceso por usuario (cuentas nominativas) | C | C | Sí | Cada vendedor con su propio asiento; alta y baja por SCIM desde Entra | — | Semana 1-2 | El SCIM con Entra es custom y admite un solo IdP | HS/EF/FA | S2, S9 [V] |
| A2 | MFA obligatoria | C | C | Sí | Exigir SSO: el MFA lo aplica Entra. Para cuentas de emergencia, 2FA nativo con passkey o app | — | Semana 1 | El 2FA nativo solo aplica al login con usuario y contraseña; con SSO, el MFA es del IdP | HS/FA | S1, S3 [V] |
| A3 | SSO con Microsoft Entra ID | C | C | Sí (Pro+) | App de galería Entra, SAML; Super Admin | — | Semana 1 | — | FA/EF | S1, S21 [V] |
| A4 | Perfiles de acceso basados en roles | CP | C | Pro: permisos por usuario. Ent: permission sets | Diseñar una matriz de roles (vendedor, jefatura, administrador, solo lectura) | — | Semana 2 | En Pro no hay permission sets reutilizables; se asignan permisos usuario por usuario | EF | S9 [V] |
| A5 | Principio de mínimo privilegio | CP | C | Sí | Equipos, visibilidad por propietario o equipo, restricción de exportación, Super Admin mínimo | — | Semana 2 | Sin Sensitive Data (Pro), no hay restricción de lectura por campo | EF/FA | S9, S10 [V]; exportación [I] |
| A6 | Bloqueo de autenticación heredada | C | C | Sí | En HubSpot: exigir SSO y deshabilitar email/contraseña y logins sociales. En Entra: política de Acceso Condicional que bloquee legacy auth | Entra ID P1 [I] | Semana 1 | Dejar 1-2 cuentas de emergencia exentas, documentadas | FA/EF | S1, S4 [V]; licencia Entra [I] |

## B. Respaldo y recuperación

| ID | Requisito | Pro | Ent | ¿En licencia? | Configuración adicional | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | Respaldo automático | CP | C | Pro: semanal manual. Ent: diario y programado | Programar backup diario (Ent) o usar una app de terceros | 3P desde USD 25/mes | Semana 3 | No incluye asociaciones ni actividades. El archivo expira en 14 días si no se descarga | HS/EF | S12 [V]; S22 |
| B2 | Respaldo cifrado | CP | CP | HubSpot: backups internos en medios durables [V]. La descarga del cliente es un archivo | Guardar el archivo en el almacenamiento cifrado de FA (Azure/SharePoint) o usar ProBackup (cifrado en AWS) | 3P | Semana 3 | El archivo descargado no viene cifrado por HubSpot [I] | EF/FA/3P | S12, S20 [V]; S22 |
| B3 | Copias aisladas o inmutables | NC | RD | No nativo | Llevar el backup diario a Azure Blob con política de inmutabilidad (WORM) en el tenant de FA, o a una app de terceros con versiones independientes | Almacenamiento FA + 3P | Semana 3-4 | Ninguna app declara «inmutable» en su ficha; hay que validar con el proveedor | EF/FA/3P | S12, S22; inmutabilidad [I] |
| B4 | Política de retención definida | CP | CP | Internos: 30 días [V]; papelera 90 días; rollback 14 días | Definir la retención propia (p. ej., 12 meses diarios + 7 años mensuales) en el destino del respaldo | 3P | Semana 3 | La retención de HubSpot no es configurable por el cliente [I] | EF/FA | S13, S14, S20 [V] |
| B5 | Pruebas periódicas de restauración | RD | CP | — | Prueba trimestral: restaurar en el sandbox (Ent) y conciliar conteos. En Pro no hay sandbox | Horas EF | Antes del go-live y luego trimestral | La restauración desde el archivo es por importación o API; no hay un «restore» nativo desde el backup [I] | EF | S11, S12 [V]; procedimiento [I] |
| B6 | Procedimientos documentados de recuperación | RD | RD | — | Runbook de Efeonce: papelera, Restore CRM changes, importación del backup, DR de HubSpot | Horas EF | Semana 4 | — | EF | S13, S14 [V] |

## C. Registros de auditoría

| ID | Requisito | Pro | Ent | ¿En licencia? | Configuración adicional | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Accesos y autenticaciones | C | C | Sí | Login History y API de login (90 días) | — | Semana 2 | La UI conserva 30 días; para retención larga hay que enviar a Wazuh | HS | S7, S8 [V] |
| C2 | Cambios de configuración | CP | C | Ent: más categorías y metadata | — | — | — | Pro solo filtra Login y Security Activity | HS | S7 [V] |
| C3 | Creación, modificación y eliminación de datos | CP | C | Ent: audit log completo y por API; historial de propiedades en el registro | — | — | — | Solo acciones de usuarios; los cambios hechos por formularios no aparecen [V, según búsqueda] | HS | S7, S8 [V] |
| C4 | Exportación y descarga | CP | C | Security activity incluye exportaciones; hay log y notificación de exportaciones | Activar notificaciones de exportación | — | Semana 2 | El tier del log de exportaciones no se verificó [I] | HS/EF | S7 [V]; log de exportaciones [I] |
| C5 | Identificación de usuario, fecha, hora, origen y resultado | CP | C | La exportación de security activity trae hora, acción, usuario, objeto y ubicación aproximada | — | — | — | El campo «resultado» explícito por evento no se verificó [I] | HS | S7 [V] |
| C6 | Registros protegidos contra alteración | CP | CP | Los genera el sistema; no hay edición por el usuario [I] | Copia en Wazuh, que es el registro de custodia de FA, con su integridad | — | Semana 4 | HubSpot no declara la inalterabilidad en las fuentes leídas | HS/FA | [I] |
| C7 | Disponibles para revisión y exportación | C | C | Exportación por UI (Super Admin) y API (Ent) | — | — | — | Pro no tiene API de audit log | HS | S7, S8 [V] |

## D. Roles y cuentas compartidas

| ID | Requisito | Pro | Ent | ¿En licencia? | Configuración adicional | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Indicar roles estándar | C | C | Super Admin, permisos por herramienta y por usuario | Documentar en la propuesta | — | — | — | EF | S9 [V] |
| D2 | Roles personalizados | CP | C | Ent: crear y editar permission sets | — | — | Semana 2 | En Pro se replican permisos a mano | HS/EF | S9 [V] |
| D3 | Evitar cuentas compartidas | C | C | Asientos nominativos con SSO + SCIM | Prohibir cuentas genéricas por política | — | — | — | FA/EF | S1, S2 [V] |
| D4 | **Sesión única: no se permite multisesión** | **NC** | **NC / RD** | **No existe un control nativo** de sesiones concurrentes | Compensar con: (1) control de sesión de Entra mediante Defender for Cloud Apps (Conditional Access App Control); (2) frecuencia de inicio de sesión corta en Entra y timeout corto en HubSpot; (3) regla en Wazuh que alerte logins simultáneos desde IP o dispositivos distintos, con respuesta «Log Out of All Sessions» | Defender for Cloud Apps [I] | Semana 4 | La app móvil mantiene la sesión 30 días. **Es un riesgo crítico: hay que declararlo como «requiere desarrollo/control compensatorio», no como «cumple»** | FA/EF | S6, S7 [V]; Defender [I] |

## E. Seguridad de los datos

| ID | Requisito | Pro | Ent | ¿En licencia? | Configuración adicional | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | Cifrado en tránsito y en reposo | C | C | Sí | — | — | — | Tránsito: TLS 1.2/1.3 [V]. Reposo: «por capas», sin algoritmo publicado | HS | S16, S20 [V] |
| E2 | Separación lógica entre clientes | CP | CP | Multi-tenant SaaS | Pedir el SOC 2 Type II como evidencia | — | — | No se leyó un texto explícito de segregación por cliente [I] | HS | [I]; SOC 2 a pedido (S16) |
| E3 | Controles contra acceso no autorizado | C | C | SSO, 2FA, IP y ubicación, permisos | — | — | Semana 1-2 | — | HS/FA | S1, S3, S5 [V] |
| E4 | Prevención de fuga de información | CP | CP | Notificación de exportación, restricción de permisos; Sensitive Data (Ent) | DLP real con Defender for Cloud Apps (bloquear descargas en sesión) | Defender [I] | Semana 4 | HubSpot no tiene DLP propio [I] | FA/EF | S10 [V]; [I] |
| E5 | Clasificación y retención de datos | NC | CP | Ent: propiedades Sensitive/Highly Sensitive | Matriz de clasificación por propiedad; retención por proceso | — | Semana 3 | No hay políticas de retención automáticas por objeto [I] | EF/FA | S10 [V] |
| E6 | Eliminación segura al término | C | C | DPA §6 | Pedir certificado de borrado al término | — | Al término | Los backups archivados se borran según las prácticas de HubSpot | HS | S16 [V] |
| E7 | Restricción de exportaciones masivas | CP | C | El permiso de exportación se puede quitar por usuario [I] | Solo administradores exportan; alertas de exportación hacia Wazuh | — | Semana 2 | — | EF/FA | S7 [V]; permiso [I] |
| E8 | Ubicación y jurisdicción | C | C | Elegir el data center: UE (Alemania) o EE. UU. | Decisión de FA; el data center se puede cambiar en planes pagos | — | Antes del alta | No hay región en Chile ni en LATAM | HS/FA | S15 [V] |
| E9 | Subencargados | C | C | Lista pública | Adjuntar la lista vigente | — | — | Incluye proveedores de IA; se puede apagar HubSpot AI [I] | HS | S18 [V] |
| E10 | Portabilidad y devolución | C | C | Exportación de datos y DPA §6 | Plan de salida en el runbook | — | — | — | HS/EF | S16 [V] |
| E11 | Medidas en dispositivos móviles | CP | CP | 2FA o SSO, restricción por IP también en móvil | Acceso Condicional con dispositivo cumplido; MDM de FA | Intune [I] | Semana 4 | La app móvil mantiene la sesión 30 días; el soporte de Intune MAM no está verificado [I] | FA/EF | S5, S7 [V] |

## F. Gestión de vulnerabilidades

| ID | Requisito | Pro | Ent | Estado y nota | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Programa documentado (inventario, análisis, pentest independiente, dependencias, configuraciones, parches) | C | C | Auditorías anuales, pentest por terceros y gestión formal de vulnerabilidades [V]. El detalle de inventario y dependencias está en el SOC 2 [I] | HS | S16, S19 [V] |
| F2 | Plazos máximos de remediación por criticidad | CP | CP | No publicados. **Pedírselos a HubSpot por escrito** | HS | [I] |
| F3 | Procedimiento para vulnerabilidades sin parche | CP | CP | No publicado | HS | [I] |
| F4 | Comunicación de riesgos relevantes | CP | CP | status.hubspot.com y notificaciones del DPA | HS | S16, S23 [V] |
| F5 | Evidencia o informes ejecutivos | C | C | Resúmenes de pentest y SOC 2 a pedido, confidenciales; SOC 3 público | HS | S16, S19 [V] |

## G. Desarrollo seguro, integraciones y cambios

| ID | Requisito | Pro | Ent | Estado y nota | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Desarrollo seguro en web, móvil y API | CP | CP | Cubierto por el programa de seguridad y el SOC 2 [I]. El código propio de Efeonce (colector Wazuh, integración QAD) sigue el SDLC de Efeonce con revisión de código | HS/EF | S19 [V]; [I] |
| G2 | Autenticación y autorización por integración; limitación de solicitudes | C | C | OAuth o tokens de app privada por integración. HubSpot aplica rate limits a la API | HS/EF | [I] (docs de developers no leídas en detalle) |
| G3 | Integraciones Outlook, Teams, SharePoint, OneDrive y QAD con permisos mínimos, credenciales propias, registro y revocación | CP | CP | Outlook y Teams usan consentimiento OAuth de Microsoft, revisable y revocable en Entra como app empresarial [I]. QAD requiere desarrollo (API/iPaaS) con su propia credencial | FA/EF | [I] |
| G4 | Gestión de cambios y ambientes dev/pruebas/producción | NC | C | **Sandbox estándar solo en Enterprise.** Efeonce opera con control de cambios: sandbox → aprobación → producción | HS/EF | S11 [V] |

## H. Disponibilidad y continuidad

| ID | Requisito | Pro | Ent | Estado y nota | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | Alta disponibilidad, redundancia, monitoreo, DR probado | C | C | Microservicios en múltiples data centers, 3 réplicas, backups horarios y diarios, subconjunto en otra región, postmortems | HS | S20 [V] |
| H2 | Disponibilidad mensual comprometida | CP | CP | 99,95 % como «esfuerzo comercialmente razonable». Supera el 99,9 % pedido, pero **no es una garantía firme** | HS | S17 [V] |
| H3 | Exclusiones del SLA | C | C | Declaradas: fuerza mayor, terceros, mal uso y mantenimiento a discreción | HS | S17 [V] |
| H4 | RTO y RPO | NC | NC | **No publicados.** Indicio: snapshots con recuperación «en minutos» y backups horarios (S20). Pedir valores a HubSpot | HS | S20 [V]; [I] |
| H5 | Ventanas de mantenimiento | NC | NC | No publicadas; quedan a discreción de HubSpot | HS | S17 [V] |
| H6 | Frecuencia de pruebas de continuidad | CP | CP | Cubierto por el SOC 2 [I]; no se publica | HS | [I] |
| H7 | Compensaciones por incumplimiento | CP | CP | Crédito prorrateado solo si hay ≥ 2 meses consecutivos bajo 99,95 % | HS | S17 [V] |
| H8 | Historial reciente de disponibilidad | C | C | status.hubspot.com tiene el historial de incidentes (p. ej., 13/05/2026). Las cifras de agregadores externos no son confiables y no se usan | HS | S23 [V] |

## I. Incidentes

| ID | Requisito | Pro | Ent | Estado y nota | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | Monitoreo, detección y respuesta, escalamiento, canal 24/7 | C | C | Monitoreo continuo y respuesta formal de HubSpot. Efeonce suma la mesa de soporte y la escalada hacia HubSpot | HS/EF | S16, S19 [V] |
| I2 | Notificación oportuna, evidencias, informe de causa raíz | CP | CP | 72 h para brechas de datos personales; registro de incidentes y postmortem interno. **No hay tiempos por severidad publicados** | HS/EF | S16, S20 [V] |

## J. Evidencias de controles

| ID | Requisito | Estado | Nota | Evidencia |
| --- | --- | --- | --- | --- |
| J1 | Certificaciones o auditoría independiente | CP | SOC 2 Type II y SOC 3. **HubSpot no tiene ISO 27001 propio** (sí AWS). No se debe afirmar ISO 27001 de HubSpot | S15, S19 [V] |
| J2 | Políticas de seguridad y privacidad | C | DPA, Security Overview y Trust Center | S16, S19 [V] |
| J3 | Gestión de terceros | C | Lista de subencargados y SOC 2 | S18 [V] |
| J4 | Capacitación del personal | CP | No verificado en las fuentes leídas | [I] |
| J5 | Antecedentes del centro de datos | C | AWS con ISO 27001 y SOC 2 | S15, S16 [V] |

## K. Requisitos obligatorios de máxima seguridad sobre plataformas Microsoft

| ID | Requisito | Pro | Ent | ¿En licencia? | Configuración y mitigación | Costo | Plazo | Limitaciones | Resp. | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K1 | Integración por conector o API con el SIEM Wazuh | NC | RD | Ent: API de audit log, login y security. Pro: solo login y security | **Colector construido por Efeonce:** servicio que consulta `account-info/v3/activity/audit-logs`, login y security cada N minutos, normaliza a JSON y entrega a Wazuh (syslog o archivo leído por el agente), con decoders y reglas propias. Los logs de Entra van a Wazuh por su integración con Microsoft [I] | Desarrollo EF + hosting | Semana 3-5 | Sin conector nativo. Latencia de minutos, no tiempo real | EF/FA | S8 [V]; patrón Wazuh [I] |
| K2 | Apps con permisos mínimos y consentimiento administrativo controlado | CP | CP | El consentimiento de las integraciones Microsoft se gestiona en Entra [I] | Exigir consentimiento de administrador en Entra; scopes mínimos en apps privadas de HubSpot | — | Semana 2 | — | FA/EF | [I] |
| K3 | Sin secretos permanentes si existe certificado, identidad administrada o federación | CP | CP | HubSpot no ofrece autenticación de API por certificado [I] | El SSO de usuario es federado (SAML). Para el colector y QAD: token de app privada en Azure Key Vault con rotación periódica, o app OAuth con refresh token. Se declara como limitación | — | Semana 3 | Riesgo de que se interprete como incumplimiento | EF | [I] |
| K4 | Revisar, revocar y auditar permisos, tokens y consentimientos | CP | C | Security activity y audit log (Ent); consentimientos en Entra | Revisión trimestral de accesos | — | Continuo | — | FA/EF | S7, S8 [V] |
| K5 | Zero Trust: identidad, riesgo, dispositivo, ubicación, sensibilidad y sesión | CP | CP | Lo provee Entra: Acceso Condicional (riesgo requiere P2, dispositivo requiere Intune) + IP y ubicación en HubSpot + Sensitive Data (Ent) | Políticas de Acceso Condicional diseñadas con FA | Entra P1/P2, Intune, Defender [I] | Semana 1-4 | Depende de las licencias Microsoft de FA | FA/EF | S5, S10, S21 [V]; licencias [I] |
| K6 | TLS 1.2+ en tránsito y AES-256 en reposo | C / CP | C / CP | TLS 1.2/1.3 [V]. AES-256 no está explícito | Pedir la confirmación a HubSpot (SOC 2) | — | — | Algoritmo en reposo no publicado | HS | S20 [V] |
| K7 | Administración y rotación de claves | CP | CP | Gestionadas por HubSpot y AWS [I]. No se encontró BYOK | Declarar como limitación | — | — | — | HS | [I] |
| K8 | Segregación de datos por cliente | CP | CP | Ver E2 | SOC 2 | — | — | — | HS | [I] |
| K9 | Respaldo cifrado e inmutable | NC | RD | Ver B2 y B3 | Backup diario Ent → Azure Blob inmutable de FA, o 3P | 3P/almacenamiento | Semana 3-4 | — | EF/FA/3P | S12, S22 |
| K10 | Declarar regiones de almacenamiento, procesamiento, respaldo y recuperación | C | C | Región elegida con DR dentro de la misma región; algunos procesamientos (soporte, IA) fuera | Declararlo por escrito | — | — | S20 menciona Virginia, Ohio y Frankfurt, una versión anterior; prevalece S15 | HS | S15, S18 [V] |
| K11 | SLA ≥ 99,9 %, pruebas anuales de continuidad, RTO/RPO, respaldo geográficamente separado, evidencia de restauraciones | CP | CP | 99,95 % como esfuerzo; subconjunto crítico en otra región; sin RTO/RPO | Las pruebas de restauración propias de Efeonce (B5) son la evidencia | — | Trimestral | Sin RTO/RPO comprometidos | HS/EF | S17, S20 [V] |
| K12 | MFA resistente al phishing + Acceso Condicional | C (vía Entra) | C (vía Entra) | Exigir SSO; Entra aplica FIDO2, Windows Hello o passkeys con «Authentication strength» [I] | Política de Acceso Condicional para la app HubSpot | Entra P1 [I] | Semana 1 | El 2FA nativo de HubSpot admite passkeys, pero el control fuerte vive en Entra | FA/EF | S1, S3 [V]; [I] |
| K13 | Gestión de privilegios | CP | C | Permission sets (Ent); Super Admin mínimo; PIM en Entra para el rol de administrador de la app [I] | — | Entra P2 para PIM [I] | Semana 2 | — | FA/EF | S9 [V] |
| K14 | Indicar las licencias Microsoft y del CRM requeridas | — | — | — | CRM: **Sales Hub Enterprise** (10 asientos). Microsoft: Entra ID P1 como mínimo (Acceso Condicional); P2 para riesgo y PIM; Defender for Cloud Apps para el control de sesión y DLP; Intune para dispositivos [I]. **Confirmar qué licencias ya tiene FA** (M365 E3/E5 o Business Premium) | Licencias HS y MS | — | — | EF | [I] |

## L. Obligatorios de aceptación antes de producción

| Requisito | Pro | Ent | Comentario |
| --- | --- | --- | --- |
| MFA | C | C | Vía Entra con SSO obligatorio |
| Administración de usuarios | CP | C | SCIM + permission sets |
| Cifrado | C/CP | C/CP | AES-256 por confirmar |
| Auditoría | CP | C | Pro no tiene API ni categorías completas |
| Respaldo | CP | C/RD | Ent diario; la inmutabilidad requiere un destino externo |
| Recuperación | CP | CP | Papelera 90 días, rollback 14 días y runbook; sin RTO/RPO de HubSpot |
| Parches | C | C | SaaS gestionado por HubSpot; sin plazos por criticidad publicados |
| Respuesta a incidentes | CP | CP | 72 h para brechas de datos personales; sin tiempos por severidad |
| Alta disponibilidad | C/CP | C/CP | 99,95 % como esfuerzo |

## Conclusión

**La edición mínima viable es Sales Hub Enterprise.** Professional queda en «no cumple» en varios obligatorios:
- Audit log por API, imprescindible para Wazuh.
- Categorías completas de auditoría.
- Sandbox para separar ambientes.
- Permission sets.
- Sensitive Data y permisos por campo.
- Backup diario programado.

### Incumplimientos críticos en riesgo y mitigación

| # | Riesgo crítico | Mitigación de Efeonce |
| --- | --- | --- |
| 1 | **Sesión única / sin multisesión:** no hay control nativo y la app móvil mantiene la sesión 30 días | Acceso Condicional con control de sesión (Defender for Cloud Apps), frecuencia de inicio de sesión corta, timeout corto en HubSpot y regla de Wazuh para sesiones concurrentes con cierre remoto. Se declara como «requiere control compensatorio» |
| 2 | **SIEM Wazuh:** no hay conector nativo | Colector de Efeonce sobre la Account activity API (Ent) + logs de Entra hacia Wazuh. Se entrega con decoders y reglas |
| 3 | **Respaldo inmutable:** no es nativo | Backup diario de Enterprise exportado a Azure Blob inmutable en el tenant de FA, o una app de terceros validada; pruebas trimestrales de restauración en el sandbox |
| 4 | **RTO/RPO, ventanas de mantenimiento y SLA firme:** HubSpot solo publica 99,95 % como esfuerzo, con crédito tras 2 meses | Pedir a HubSpot (PDM o especialista en crecimiento) una declaración escrita. El RTO y RPO de la capa de Efeonce se compromete en el SLA de soporte |
| 5 | **Sin secretos permanentes:** HubSpot no autentica la API por certificado | Federación para usuarios; tokens en Key Vault con rotación; app OAuth donde sea posible. Se declara como limitación |
| 6 | **AES-256, rotación de claves y segregación sin texto público** | Pedir el SOC 2 Type II bajo NDA y responder con esa evidencia |
| 7 | **ISO 27001:** HubSpot no lo tiene | Presentar SOC 2 Type II y SOC 3, más la ISO 27001 de AWS. No afirmar una ISO propia |
| 8 | **Licencias Microsoft:** Acceso Condicional, riesgo, PIM y control de sesión dependen de Entra P1/P2 y Defender | Pedir a FA su inventario de licencias y declarar los costos adicionales como responsabilidad de FA |
