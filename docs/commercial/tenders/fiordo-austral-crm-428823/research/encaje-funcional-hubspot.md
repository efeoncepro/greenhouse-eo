# Encaje funcional HubSpot — Fiordo Austral, Wherex 428823

> **Tipo:** investigación interna. No es material para el comprador. Escrito el 05/11/2026.
> **Alcance:** las secciones 3 (funcional), 5 (implementación y migración), 6 (soporte) y 7 (integraciones) de las bases. El bloque de ciberseguridad (sección 4) se investiga aparte.
> **Fuentes:** knowledge.hubspot.com, consultado vía búsqueda el 05/11/2026; el catálogo legal y la página de precios de HubSpot; las skills `hubspot-solutions-partner` (`modules/01_PRODUCTO_2026.md`, `12_IMPLEMENTACION.md`) y `hubspot-as-a-service`.
> **Cómo leer la columna «Estado»:**
> - **Verificado:** está en la documentación oficial de HubSpot de este barrido.
> - **Conocido:** es capacidad estándar y conocida de HubSpot, pero hoy no se volvió a verificar.
> - **Inferido:** es criterio nuestro o un dato sin fuente oficial.

## Conclusión corta

- **Sales Hub Professional** cubre lo central del pliego: pipeline, actividades, secuencias, workflows, reportes, documentos, app móvil, Outlook y Teams.
- **Cuatro requisitos empujan a Sales Hub Enterprise:**
  - **Especificaciones técnicas modeladas como objeto propio:** los objetos personalizados son exclusivos de Enterprise.
  - **Flujos de aprobación internos nativos:** las aprobaciones de etapa de negocio son de Sales Hub Enterprise.
  - **Ambientes separados de pruebas y producción:** el sandbox estándar requiere Enterprise.
  - **Permisos por campo y jerarquías de equipos:** las restricciones de acceso por propiedad son de Enterprise.
- **Recomendación funcional:** Sales Hub Enterprise para unos 10 usuarios.
  - La integración con QAD y los mapeos personalizados de Outlook Contacts necesitarían, además, **Data Hub Professional** o un middleware fuera de HubSpot.
  - Para la oferta, la integración con QAD conviene tratarla como **fase opcional con discovery técnico**, no como alcance base: es deseable, no obligatoria.

## Matriz requisito → solución

Ediciones: Pro = Sales Hub Professional; Ent = Sales Hub Enterprise.

### a) Clientes y contactos

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Registro de empresas y contactos | Objetos estándar Empresa y Contacto, asociados entre sí, con etiquetas de asociación (por ejemplo «Comprador», «Calidad», «Logística»). | Pro (incluso inferior) | Modelo de datos, propiedades, etiquetas de asociación y vistas por rol. | [Plan your data model](https://knowledge.hubspot.com/object-settings/plan-your-hubspot-data-model) | Verificado |
| Historial completo de interacciones | Línea de tiempo por registro, con correos registrados, llamadas, reuniones, notas, tareas y documentos abiertos. | Pro | Reglas de asociación automática y registro de correo desde Outlook. | [Log activities](https://knowledge.hubspot.com/records/manually-log-activities-on-records) | Verificado |
| Segmentación por país, región y mercado | País estándar más propiedades propias: macro-región (Asia, Europa, Américas, Oceanía) y mercado o uso (acuicultura, petfood, nutrición animal, etc.). Se usan en vistas, listas y reportes. | Pro | Taxonomía validada con el área comercial y normalización de los datos que vienen del Excel. | [Create properties](https://knowledge.hubspot.com/properties/create-and-edit-properties) | Conocido |
| Clasificación por tipo y estado | Propiedades «Tipo de cliente» (distribuidor, fabricante de alimento, trader) y «Estado» (prospecto, activo, inactivo, perdido). El paso de activo a inactivo se automatiza con workflow según la fecha de la última actividad o del último negocio ganado. | Pro | Definición de reglas y workflow de recálculo. | [Workflows FAQ](https://knowledge.hubspot.com/workflows/workflows-faq) | Conocido |

### b) Gestión comercial

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Oportunidades, pipeline visual y etapas de negociación | Negocios con pipelines y etapas propias, vista tablero, reglas de pipeline y probabilidad por etapa. | Pro | Diseño de pipelines; ver «Arquitectura» más abajo. | [Pipeline rules](https://knowledge.hubspot.com/object-settings/set-up-pipeline-rules) | Verificado |
| Recordatorios automáticos de seguimiento | Tareas con fecha y recordatorio, cola de tareas y feed de acciones (también en la app móvil). | Pro | Plantillas de tareas por etapa. | [Action feed mobile](https://knowledge.hubspot.com/prospecting/use-the-action-feed-in-the-hubspot-mobile-app) | Verificado |
| Registro de llamadas, reuniones, correos y visitas | Actividades nativas. La «visita» se modela como tipo de reunión «Visita en terreno / planta / feria», con resultado y ubicación. | Pro | Tipos y resultados de reunión; deben configurarse en escritorio para que aparezcan en la app móvil. | [Log activities](https://knowledge.hubspot.com/records/manually-log-activities-on-records) | Verificado |

### c) Especificaciones técnicas

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Requisitos de producto por cliente (% proteína, % FFA y otros) en campos personalizados | **Opción A (Ent):** objeto personalizado «Especificación técnica», asociado a Empresa, Negocio y Producto. Permite varias especificaciones por cliente y producto, con historial de cambios por propiedad.<br>**Opción B (Pro):** grupo de propiedades «Requisitos de calidad» en Empresa, más propiedades de línea de pedido en el Negocio. Topa cuando un cliente tiene varias especificaciones. | A: Ent · B: Pro | Diseño del objeto y de las propiedades numéricas con rangos (mínimo y máximo), validaciones y una vista de especificaciones en la ficha del cliente. | [Understand objects](https://knowledge.hubspot.com/records/understand-objects) — los objetos personalizados requieren Enterprise | Verificado (edición) · Inferido (modelo) |

### d) Gestión documental

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Adjuntar contratos, especificaciones, certificados y correos a clientes y oportunidades | Adjuntos en registros y correos registrados. Herramienta «Documentos» para contenido de ventas con seguimiento de aperturas (hasta 250 MB por archivo; acceso restringible en Pro y Ent). | Pro | Biblioteca de documentos comerciales y permisos. | [Limit access to assets](https://knowledge.hubspot.com/account-security/limit-access-to-your-hubspot-assets) | Verificado |
| Control de versiones o repositorio documental | HubSpot **no versiona** adjuntos (inferido). El versionado lo da SharePoint u OneDrive con la app oficial **Microsoft SharePoint & OneDrive**, todavía en **beta**: vincula archivos a registros y crea carpetas por cliente desde workflow. La instala cada usuario y puede requerir consentimiento del tenant M365. | Pro (app gratuita, beta) | Plantilla de carpetas por cliente, workflow de creación, tarjeta en la ficha del registro y consentimiento con TI. | [SharePoint & OneDrive en HubSpot](https://knowledge.hubspot.com/integrations/add-and-use-sharepoint-and-onedrive-files-in-hubspot) · [Marketplace](https://ecosystem.hubspot.com/marketplace/listing/sharepoint-onedrive) | Verificado (beta) · Inferido (sin versionado nativo) |

### e) Reportes y gestión

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Actividad por vendedor | Reportes de actividad de ventas y de metas por usuario o equipo. | Pro | Tablero «Actividad comercial». | [Custom reports](https://knowledge.hubspot.com/reports/create-custom-reports) | Verificado |
| Clientes activos e inactivos; reportes por país | Reportes personalizados sobre las propiedades de estado y país. | Pro | Tablero «Cartera». | Ídem | Verificado |
| Oportunidades abiertas, ganadas y perdidas | Reportes de pipeline, motivo de pérdida y pronóstico (con jerarquía de equipos en Ent). | Pro | Tablero «Pipeline y pronóstico» y propiedad obligatoria de motivo de pérdida. | [Sales Hub pricing guide](https://blog.hubspot.com/sales/hubspot-sales-hub-pricing) | Verificado (tercero oficial) |
| Exportación a Excel | Exportación de vistas, reportes y registros en XLSX o CSV. | Pro | — | Conocido | Conocido |

### f) Aplicación móvil

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| App para teléfono; registro de visitas; actualización desde el móvil; tareas y notificaciones | App iOS y Android: crear y editar registros, registrar actividades, tareas, notificaciones, feed de acciones, Breeze Assistant y Mobile Notetaker (graba reuniones con transcripción y resumen; graba offline y sincroniza al volver la conexión). | Pro | Configuración móvil, tipos de visita y capacitación en terreno. | [Mobile app features](https://knowledge.hubspot.com/mobile/hubspot-mobile-app-features) · [Mobile Notetaker](https://knowledge.hubspot.com/meetings-tool/use-mobile-notetaker-in-the-hubspot-mobile-app) | Verificado |
| Ferias | Escáner de tarjetas de visita en la app (Android; iOS 16 o superior; no en iPad). Usa los modelos de IA de HubSpot. | Pro | Lista y campaña «Feria X» y flujo de seguimiento posterior a la feria. | [Import contacts mobile](https://knowledge.hubspot.com/import-and-export/import-contacts-on-the-hubspot-mobile-app) | Verificado |
| Plantas o zonas sin señal | **Límite:** sin conexión la app es de solo lectura (hasta 200 registros en caché) y no permite crear ni editar. Tampoco hay check-in geolocalizado nativo. | — | Declararlo en la matriz como limitación. Mitigación: Mobile Notetaker offline y registro diferido. | [Offline records](https://knowledge.hubspot.com/records/access-records-offline-in-the-hubspot-mobile-app) | Verificado |

### g) Automatizaciones

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Alerta de cliente no contactado en un período | Workflow sobre «Último contacto» o «Fecha de última actividad»: crea una tarea y notifica al dueño o a Teams. | Pro (hasta 300 workflows; Ent, 1.000) | Reglas por segmento; por ejemplo, 30, 60 o 90 días según el tipo de cliente. | [Sales Hub pricing guide](https://blog.hubspot.com/sales/hubspot-sales-hub-pricing) | Verificado |
| Recordatorios de reuniones y tareas | Recordatorios nativos y sincronización con el calendario de Outlook. | Pro | — | [Calendar sync](https://knowledge.hubspot.com/integrations/use-hubspots-integration-with-google-calendar-or-outlook-calendar) | Verificado |
| Tareas automáticas después de reuniones | Workflow disparado por el resultado de la reunión. Breeze sugiere próximos pasos desde la grabación o la transcripción. | Pro | Workflows por tipo de reunión. | [Mobile Notetaker](https://knowledge.hubspot.com/meetings-tool/use-mobile-notetaker-in-the-hubspot-mobile-app) | Verificado (IA) · Conocido (workflow) |
| Flujos de aprobación internos | **Aprobaciones de etapa de pipeline:** etapa de aprobación por pipeline, condiciones, «todos» o «cualquiera» de los aprobadores, no se puede saltar, y recordatorios a aprobadores (Ent). En Pro hay aprobación de cotizaciones del Revenue Hub nuevo y aprobaciones simuladas con tareas en workflow. | Ent (nativo) | Matriz de aprobación (descuentos, condiciones especiales, contratos) y permiso «Aprobar». | [Pipeline approvals](https://knowledge.hubspot.com/object-settings/pipeline-approvals) · [Approval reminders](https://knowledge.hubspot.com/account-management/send-approval-reminders) | Verificado |
| Correos de seguimiento automatizados | Secuencias 1:1 desde el buzón del vendedor (Pro, 500 envíos por usuario al día; Ent, 1.000 y secuencias disparadas por workflow). | Pro | Plantillas en español e inglés para el mercado de exportación. | [Sales Hub pricing guide](https://blog.hubspot.com/sales/hubspot-sales-hub-pricing) | Verificado |
| Alertas de oportunidades próximas al cierre | Workflow sobre la fecha de cierre: tarea y aviso a Teams. | Pro | — | Conocido | Conocido |
| Dashboards automáticos | Tableros con envío programado por correo. | Pro | 3 a 4 tableros base. | Conocido | Conocido |

### Implementación y migración (sección 5)

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Migración desde Excel | Importador con varios archivos y asociaciones. Deduplicación por correo o dominio. Gestor de duplicados individual hasta 10.000 pares (Pro y Ent); la gestión masiva y las reglas propias requieren Data Hub Professional. | Pro | Limpieza, normalización (países, mercados, especificaciones), plantillas de importación, carga de prueba en sandbox y validación con el área comercial. | [Manage duplicates](https://knowledge.hubspot.com/records/manage-duplicate-records) · [Import tool](https://knowledge.hubspot.com/import-and-export/understand-the-import-tool) | Verificado |
| Ambientes de pruebas y paso a producción | Sandbox estándar: 1 incluido con Enterprise; los adicionales son add-on. Despliegue a producción desde sandbox nuevo; los sandboxes legacy dejaron de tener soporte el 30/04/2026. Límites: 200.000 registros por objeto y una sincronización inicial de 5.000 contactos. | Ent | Configuración y UAT en sandbox, despliegue controlado y registro de cambios. | [Sandbox](https://knowledge.hubspot.com/account-management/set-up-a-hubspot-standard-sandbox-account) · `01_PRODUCTO_2026.md` §6 | Verificado |
| Capacitación a usuarios y administradores | — | — | Plan por rol (vendedores, jefatura, administrador) y material en español. | — | — |
| Onboarding de HubSpot | Onboarding obligatorio de HubSpot: USD 1.500 en Pro y USD 3.500 en Ent (precio de lista). | — | Confirmar con el PDM si Efeonce como partner reemplaza o complementa el onboarding obligatorio. | [Products & Services Catalog](https://legal.hubspot.com/hubspot-product-and-services-catalog/products) | Verificado (lista) |

### Soporte (sección 6)

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| Soporte posterior con severidades, horarios, tiempos y escalamiento | HubSpot Pro y Ent: base de conocimiento, comunidad, teléfono (**solo en inglés**, domingo 20:00 a viernes 20:00 EST), chat y correo (respuesta objetivo de 1 día hábil). Requiere un asiento asignado. | Pro | **Mesa de soporte de Efeonce en español** con severidades, SLA, escalamiento a HubSpot e indicadores mensuales. Es la capa que pide el pliego. | [Get help with HubSpot](https://knowledge.hubspot.com/help-and-resources/get-help-with-hubspot) | Verificado |

### Integraciones (sección 7)

| Requisito de las bases | Cómo lo resuelve HubSpot | Edición mínima | Qué configura o construye Efeonce | Fuente | Estado |
| --- | --- | --- | --- | --- | --- |
| **Obligatoria:** Outlook | Bandeja de Microsoft 365 conectada, con registro automático de correos enviados y recibidos. Add-in Office 365 para Outlook (Windows, Mac y web; el add-in de escritorio clásico está en mantenimiento). El panel debe estar abierto al enviar para registrar y hacer seguimiento. | Pro (seguimiento de clics con asiento Sales) | Conexión por usuario, reglas de registro y asociación automática, y exclusión de dominios internos. | [Office 365 add-in](https://knowledge.hubspot.com/connected-email/get-started-with-the-hubspot-sales-office-365-add-in) · [Log emails](https://knowledge.hubspot.com/connected-email/log-your-sent-emails-to-the-crm) | Verificado |
| **Obligatoria:** sincronización de correos con clientes | Ídem: bandeja conectada más registro automático. | Pro | Ídem | Ídem | Verificado |
| **Obligatoria:** calendario y reuniones | App Outlook Calendar: solo el calendario principal y solo eventos creados mientras la integración está activa. Herramienta de reuniones para agendar. | Pro | Conexión y enlaces de agenda por vendedor. | [Calendar sync](https://knowledge.hubspot.com/integrations/use-hubspots-integration-with-google-calendar-or-outlook-calendar) | Verificado |
| **Obligatoria:** importar y exportar a Excel | Importador y exportación XLSX o CSV. | Pro | — | Ver «Implementación» | Verificado / Conocido |
| Deseable: ERP QAD | Ver la sección «Opción QAD». | Data Hub Pro o middleware | Discovery técnico y fase opcional. | — | Inferido |
| Deseable: Microsoft Teams | App oficial con instalación de administrador (requiere Global Admin de Teams; una instancia por cuenta). Notificaciones de workflows a canales (no privados), vinculación de empresas y negocios con canales, tareas desde Teams, registro de llamadas de Teams y sincronización de grabaciones y transcripciones de reuniones. | Pro | Canales por mercado o equipo, notificaciones clave y permisos mínimos. | [Connect Teams](https://knowledge.hubspot.com/integrations/connect-hubspot-and-microsoft-teams) · [Records & notifications](https://knowledge.hubspot.com/integrations/manage-records-and-notifications-in-microsoft-teams) | Verificado |
| Deseable: SharePoint u OneDrive | App oficial en beta (ver la fila de gestión documental). Alternativa estable de terceros: CloudFiles. | Pro | Ídem | [Marketplace](https://ecosystem.hubspot.com/marketplace/listing/sharepoint-onedrive) | Verificado (beta) |
| Deseable: contactos entre CRM y Outlook | App Outlook Contacts: instalación por usuario, sincroniza solo la carpeta personal (no compartidos ni el Active Directory), en uno o dos sentidos. Tiene 14 mapeos fijos; los personalizados requieren Data Hub. **3,1★ en 226 reseñas** por duplicados y desconexiones. | Pro | Recomendar sincronización CRM → Outlook en un sentido y por piloto, o no activarla. | [Outlook Contacts](https://knowledge.hubspot.com/integrations/connect-hubspot-and-outlook-contacts) · [Listing](https://ecosystem.hubspot.com/marketplace/apps/outlook-exchange-data-sync) | Verificado |

### IA (Breeze), sin exagerar

- **Lo útil y documentado en móvil:** Breeze Assistant, y resúmenes y próximos pasos de Mobile Notetaker.
  - *Fuentes:* [Mobile Notetaker](https://knowledge.hubspot.com/meetings-tool/use-mobile-notetaker-in-the-hubspot-mobile-app) y [Breeze en móvil](https://knowledge.hubspot.com/ai/use-breeze-assistant-on-the-hubspot-mobile-app).
- **Prospecting Agent:** cobra USD 1 por lead recomendado. No es parte del pliego; no se ofrece en la base.
- **Créditos de HubSpot:** Sales Ent incluye 5.000 y Pro 3.000, sin rollover.
  - *Fuente:* `01_PRODUCTO_2026.md`. Verificar antes de prometer volumen.
- **Ojo con la ciberseguridad:** las funciones de IA procesan datos en la nube de HubSpot. Su tratamiento debe constar en la matriz.

## Arquitectura de datos propuesta

Es una propuesta nuestra y está sin validar con Fiordo Austral.

**Objetos**

| Objeto | Función | Claves y propiedades |
| --- | --- | --- |
| Empresa (cliente o prospecto) | Cliente o prospecto | País, macro-región, mercado o uso, tipo de cliente, estado (prospecto, activo, inactivo, perdido), fecha del último negocio ganado, vendedor responsable, idioma, condiciones comerciales habituales e ID del cliente en QAD (fase 2). |
| Contacto | Persona del cliente | Rol (compras, calidad, logística, gerencia), idioma y etiqueta de asociación con la empresa. |
| Negocio (oportunidad) | Oportunidad comercial | Producto o línea, volumen en toneladas, incoterm, puerto o destino, precio por tonelada, moneda, ventana de embarque, motivo de pérdida y estado de aprobación. |
| Producto | Catálogo | Líneas de harina y aceite (catálogo a validar con Fiordo Austral). |
| Especificación técnica (personalizado, Ent) | Requisitos de calidad | Producto, % proteína mínima, % FFA máxima, humedad, ceniza, otras especificaciones, norma o certificado requerido, vigencia y estado. Asociada a Empresa (1:N), Negocio y Producto. |
| Actividades | Interacciones | Correos (Outlook), reuniones con tipo de reunión «Visita a planta», «Feria», «Reunión remota» y «Visita a cliente», llamadas, notas y tareas. |

**Pipelines**

| Pipeline | Etapas |
| --- | --- |
| P1 «Negocios exportación» | Contacto inicial → Requisitos y muestra → Oferta enviada → Negociación → Aprobación interna (aprobación nativa de Enterprise) → Ganado / Perdido |
| P2 «Mercado nacional» (si aplica) | Mismas etapas, con aprobaciones propias |
| P3 «Renovaciones y contratos marco» (opcional) | — |

**Asociaciones**

- Empresa ↔ Contacto: con etiquetas.
- Empresa ↔ Negocio.
- Negocio ↔ Especificación técnica.
- Negocio ↔ Producto: como línea de pedido.
- Especificación técnica ↔ Empresa.

**Gobierno**

- Equipos por mercado y jerarquía (Ent).
- Restricción de propiedades sensibles, como precio y margen (Ent; HubSpot advierte que esto no es un control de seguridad completo).
- Sandbox para cambios.

## Arquitectura de integraciones (diagrama textual)

```
Microsoft Entra ID ──SSO/SAML (ver research de ciberseguridad)──► HubSpot (Sales Hub Enterprise)

Microsoft 365 (Exchange Online)
  ├─ Bandeja conectada + add-in Office 365 ──► registro de correos en la línea de tiempo
  ├─ Outlook Calendar app ──► reuniones ↔ registros
  └─ Outlook Contacts app (opcional, CRM→Outlook, piloto)

Microsoft Teams ◄──notificaciones de workflow, canales por cuenta, tareas, llamadas y transcripciones── HubSpot

SharePoint/OneDrive ◄──app oficial (beta): carpeta por cliente, archivos vinculados al registro── HubSpot

Excel ──importador (carga inicial, plantillas Efeonce)──► HubSpot ──exportación XLSX──► Excel

QAD (fase opcional) ──API QAD (QXtend/REST, a confirmar)──► middleware ──API HubSpot (app privada o OAuth, scopes mínimos)──► HubSpot
         (clientes maestros, últimos pedidos y facturación resumida; sentido inicial QAD→HubSpot)

App móvil HubSpot (iOS/Android) ──visitas, ferias (escáner), tareas y Mobile Notetaker──► HubSpot
```

## Opción QAD

- **Lo que no existe:** no hay conector nativo de HubSpot ni de QAD.
- **Lo que existe en el mercado:**
  - **Stacksync** declara una sincronización bidireccional HubSpot–QAD. Es material del proveedor y suma un subencargado con impacto en la matriz de ciberseguridad.
  - **Tray.ai** indica que no tiene un conector QAD prediseñado.
  - *Fuentes:* [Stacksync](https://www.stacksync.com/integrations/hubspot-and-qad-erp) y [Tray QAD](https://tray.ai/connectors/qad-rho-integrations).
- **Opción realista** (inferida):
  1. **Discovery técnico en la implementación:** qué edición de QAD usan (Adaptive ERP en la nube o EE on-premise), qué API está disponible (QXtend o REST) y si TI permite acceso.
  2. **Fase 2 opcional:** sincronización en **un sentido, QAD → HubSpot**, de maestro de clientes (ID y razón social), pedidos y facturación resumida (fecha del último pedido y volumen de 12 meses). Esto alimenta el estado activo o inactivo y los reportes.
  3. **Vía técnica**, una de dos:
     - Middleware gestionado por Efeonce que llame a la API de HubSpot con app privada o OAuth, scopes mínimos y credenciales en un gestor de secretos.
     - Data Hub Professional, con acciones de código personalizado y webhooks (son exclusivas de Data Hub Pro y Ent).
  - Hay que alinear la vía con la exigencia de no usar secretos permanentes: preferir OAuth con rotación y documentar la revocación.
- **Esfuerzo estimado:** 4 a 8 semanas, condicionado a la API de QAD. Es inferencia nuestra, coherente con `12_IMPLEMENTACION.md` (fase de integraciones de 2 a 6 semanas).
- **Precio:** se cotiza aparte.
- *Fuentes:* [Workflow actions](https://knowledge.hubspot.com/workflows/choose-your-workflow-actions) y [Programmable automation](https://www.hubspot.com/products/data/programmable-automation).

## Referencia de licencias

Precio de lista; confirmar con el PDM y con la cotización oficial.

| Edición | Precio | Onboarding obligatorio | Total para 10 asientos |
| --- | --- | --- | --- |
| Sales Hub Pro | USD 90 por asiento al mes | USD 1.500 | USD 900 al mes |
| Sales Hub Ent | USD 150 por asiento al mes | USD 3.500 | USD 1.500 al mes |
| Data Hub Pro (si va QAD vía HubSpot) | USD 720 al mes | — | — |

- **Precio anual frente a mensual:** el precio menor es con pago anual.
- **Mínimos:** hay que confirmar si existen mínimos de asientos en Enterprise.
- *Fuentes:* [Sales pricing](https://www.hubspot.com/pricing/sales), [Catalog](https://legal.hubspot.com/hubspot-product-and-services-catalog/products) y `01_PRODUCTO_2026.md`.

## Vacíos y riesgos

1. **App móvil sin conexión:** es de solo lectura y no tiene check-in geolocalizado. Se declara como limitación en la matriz.
2. **Versionado documental:** depende de SharePoint vía una app en beta. Si Fiordo Austral no acepta una beta, la alternativa es CloudFiles, que suma un tercero.
3. **Sincronización de contactos con Outlook:** es frágil (3,1★). Proponerla en un sentido o descartarla.
4. **QAD:** sin conector; el esfuerzo depende de la API.
5. **Soporte telefónico de HubSpot:** solo en inglés. La mesa en español de Efeonce es obligatoria para cumplir la sección 6.
6. **Precios y límites de Enterprise:** el precio, los mínimos de asientos, el sandbox adicional y la exportación de datos se confirman con el PDM. Las restricciones de propiedad en Ent no son un control de seguridad completo, según HubSpot.
7. **Catálogo de productos y especificaciones de Fiordo Austral:** no está verificado. Queda para la investigación del comprador.
