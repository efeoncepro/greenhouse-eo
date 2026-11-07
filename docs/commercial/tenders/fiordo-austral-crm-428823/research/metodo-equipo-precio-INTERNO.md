# Fiordo Austral 428823 — método, equipo, soporte y precio preliminar (INTERNO)

> **Audiencia:** interna. Costos, márgenes, comisión y fuentes de costo **no viajan** al comprador.
> **Preparado:** 05/11/2026, fork de método y precio.
> **Estado:** hipótesis para validación. No es una cotización emitida, un precio aprobado ni un GO.
> **Fuentes:**
> - Bases de 6 páginas del zip 428823.
> - Catálogo V3 `operating-review-2026-10-27-v14` (`data/pricing/v3-operating/current.json`).
> - `hubspot-solutions-partner` (overlay, estado actual y módulo 11).
> - `HUBSPOT_OFFER_ARCHITECTURE_V2.md`.
> - `EFEONCE_PARTNERSHIP_REGISTRY_V1.md`.
> - `docs/context/01_quienes-somos.md` y `02_gtm.md`.
> - Precios públicos de HubSpot (§3.1).

## Ledger rápido

| Tipo | Qué es |
| --- | --- |
| **Requisito de bases** | Lo que piden §2 a §11: licencias para unos 10 usuarios, implementación, migración desde Excel, integraciones, capacitación, puesta en marcha, estabilización, soporte con SLA, ciberseguridad obligatoria con prueba técnica previa a producción, contrato de 12 meses y oferta económica con licencias, implementación y capacitación separadas. |
| **Hecho investigado** | Lista de precios de HubSpot, onboarding fee, tier Gold, Microsoft CSP y costos objetivo V3 de los perfiles HubSpot. |
| **Supuesto propio** | Horas por fase, dedicación, duración, alcance de QAD, meses de soporte, margen aplicado y monto de herramientas. |
| **Decisión pendiente** | Precio de lista y piso (Julio), edición de Sales Hub (depende de la matriz de seguridad), moneda y FX de presentación, y asignación real de personas. |

---

## 1. Metodología de implementación por fases

La duración total es de **12 semanas hasta producción, más 4 semanas de estabilización** (unos 4 meses). Los meses 5 a 12 son de soporte y operación, con lo que se cumplen los 12 meses de contrato. Es un supuesto propio: las bases piden metodología, etapas, cronograma, entregables, migración, ambientes de prueba, paso a producción, capacitación y estabilización (§5), pero no fijan plazos.

| # | Fase | Semanas | Qué se hace | Entregables (aceptación) |
| --- | --- | --- | --- | --- |
| F0 | **Descubrimiento y diseño de la solución** | 1–2 | Entrevistas con Comercial, Adquisiciones, TI y Gerencia. Inventario de los Excel. Mapa del proceso comercial: clientes, contactos, oportunidades, visitas, ferias y especificaciones de producto (% proteína, % FFA). Roles y permisos. Inventario del entorno Microsoft (Entra ID, licencias, Acceso Condicional, Wazuh). | Documento de arquitectura (modelo de datos, objetos, propiedades, pipeline, etapas, segmentación país/región/mercado, roles), mapa de integraciones, plan de migración y plan de pruebas de aceptación **firmado**. |
| F1 | **Seguridad e identidad** | 2–4 (en paralelo) | SSO con Microsoft Entra ID (SAML) y obligatoriedad del SSO. MFA resistente al phishing y Acceso Condicional, aplicados en Entra y configurados en el tenant del cliente con su admin. Roles con mínimo privilegio, bloqueo de autenticación heredada y política de sesiones. Revisión de apps OAuth y consentimientos. Envío de la auditoría de HubSpot al SIEM Wazuh. Respaldo complementario: exportación programada vía API a almacenamiento **inmutable en el tenant del cliente** (Azure Blob con política WORM o equivalente). Restricción de exportaciones. | Matriz de cumplimiento de ciberseguridad (cumple / parcial / no cumple / requiere desarrollo). Evidencias de configuración. Conector o colector hacia Wazuh probado. Job de respaldo con restauración de prueba documentada. |
| F2 | **Configuración del CRM** | 3–6 | Objetos y propiedades, incluidos los campos de especificación técnica. Pipeline y etapas. Clasificación de clientes. Repositorio documental (contratos, especificaciones, certificados). Automatizaciones: alerta de cliente sin contacto, tareas posteriores a reunión, recordatorios, aprobaciones, correos de seguimiento y alertas de cierre. Dashboards y reportes (vendedor, país, activos/inactivos, abiertas/ganadas/perdidas). App móvil. | Portal configurado en el ambiente de pruebas. Catálogo de automatizaciones. Dashboards publicados. |
| F3 | **Migración desde Excel** | 5–6 | Limpieza, deduplicación y normalización de país y región. Mapeo a propiedades. Carga de prueba, validación con el negocio y carga final. | Informe de migración: registros origen y destino, rechazos y duplicados resueltos, y muestra validada por el negocio. |
| F4 | **Integraciones** | 6–8 | Outlook (correo, calendario y reuniones), sincronización de contactos, Teams y SharePoint u OneDrive. Importación y exportación con Excel. **QAD:** sólo factibilidad y diseño (API y middleware); la construcción se cotiza aparte (§3.3). | Integraciones operativas con permisos mínimos, credenciales no compartidas y registro de actividad. Informe de factibilidad QAD. |
| F5 | **Pruebas de aceptación y prueba técnica de seguridad** | 9–10 | Pruebas funcionales por caso de uso con usuarios clave. Prueba técnica previa a producción, que las bases ponen como condición de adjudicación (§4): SSO, MFA, Acceso Condicional, logs en Wazuh, roles, cifrado, respaldo con restauración y respuesta a incidentes. | Acta de aceptación funcional y acta de la prueba técnica de seguridad con evidencia. |
| F6 | **Capacitación y puesta en marcha** | 11–12 | Capacitación de los 10 usuarios: comercial, móvil y reportes. Capacitación de administradores: usuarios, permisos, propiedades, automatizaciones y monitoreo. Paso a producción con plan de reversa. | Material y grabaciones, registro de asistencia, guía de administración y acta de paso a producción. |
| F7 | **Estabilización (hypercare)** | 13–16 | Acompañamiento cercano, ajustes, adopción semanal y calidad de datos. | Informe de cierre de estabilización y backlog de mejoras priorizado. |
| — | **Soporte y operación** | Meses 5–12 | Ver §1.1. | Informe mensual de indicadores y revisión trimestral. |

**Ambientes.** Se trabaja con un ambiente de pruebas y otro de producción. El sandbox estándar de HubSpot es una característica de **Enterprise**; en Professional hay que usar un portal de pruebas aparte o un enfoque de configuración controlada. Esto lo confirma el fork de seguridad y funcionalidad; si se verifica, la exigencia de ambientes separados (§4) es otro argumento a favor de Enterprise.

### 1.1 Soporte post-implementación (propuesta realista para Efeonce)

- **Horario de cobertura:** lunes a viernes de 9:00 a 18:30, hora de Chile, salvo festivos. Para eventos **críticos de seguridad o caída total** hay un canal de guardia permanente por teléfono y Teams, que activa a la persona de turno.

| Severidad | Ejemplo | Primera respuesta | Resolución o solución provisoria |
| --- | --- | --- | --- |
| **S1 Crítico** | CRM inaccesible para todos, incidente de seguridad o sospecha de fuga, pérdida de datos | ≤ 1 h (guardia 7×24 para seguridad) | Contención ≤ 4 h. Solución provisoria ≤ 8 h, o escalada a HubSpot o Microsoft con seguimiento cada 2 h. Informe de causa raíz ≤ 5 días hábiles. |
| **S2 Alto** | Una función clave degradada: Outlook sin sincronizar, automatización crítica caída o logs sin llegar a Wazuh | ≤ 4 h hábiles | ≤ 2 días hábiles |
| **S3 Medio** | Error en un reporte o automatización no crítica; problema de un solo usuario | ≤ 1 día hábil | ≤ 5 días hábiles |
| **S4 Bajo** | Consulta, cambio menor o mejora | ≤ 2 días hábiles | Planificado en el backlog mensual |

- **Escalamiento:**
  - N1: implementador asignado.
  - N2: consultor líder y desarrollador (integraciones y seguridad).
  - N3: dirección de la práctica RevOps & CRM, más soporte de HubSpot por el canal partner y de Microsoft cuando corresponda.
  - Ejecutivo: gerencia de Efeonce.
- **Mantenimiento preventivo mensual:**
  - Revisión de usuarios, roles y permisos, incluidas las altas y bajas del período.
  - Revisión de la auditoría y de la entrega a Wazuh.
  - Salud de las integraciones.
  - Verificación del job de respaldo, con una restauración de muestra trimestral.
  - Calidad de datos.
  - Aplicación de las novedades y cambios de seguridad que publique HubSpot.
- **Comunicación de incidentes:** S1 y S2 se informan por correo y Teams al abrirse, se actualizan periódicamente y se cierran con una nota.
- **Indicadores mensuales:**
  - Tickets por severidad.
  - Porcentaje de cumplimiento de SLA y tiempo medio de respuesta y de resolución.
  - Adopción: usuarios activos, actividades registradas y porcentaje de oportunidades actualizadas.
  - Calidad de datos: duplicados y campos obligatorios.
  - Estado de integraciones y del envío de logs.
  - Cambios aplicados.
- **Revisión trimestral** con el responsable comercial y TI.
- **Límite que hay que decir con claridad:** la disponibilidad, la redundancia, el RTO/RPO del servicio SaaS y la detección de intrusiones en su infraestructura son de HubSpot. Efeonce responde por su configuración, sus integraciones y el soporte. La matriz de seguridad tiene que separar las dos responsabilidades.

---

## 2. Equipo (squad) por roles y seniority, sin nombres

Las horas son un supuesto propio. La dedicación promedio se calcula sobre las 12 semanas de implementación (≈ 498 h de capacidad FTE, base de 180 h/mes).

| Rol (cara al cliente) | Perfil V3 de costo | Seniority | Horas F0–F7 | Dedicación promedio | Responsabilidad |
| --- | --- | --- | --- | --- | --- |
| Consultor líder HubSpot / arquitecto de solución | ECG-027 Consultor HubSpot | Senior | 72 | ≈ 14 % | Diseño, decisiones, aceptación y capacitación de administradores |
| Implementador HubSpot | ECG-025 Implementador HubSpot | Senior | 192 | ≈ 34 % (≈ 60 % en F2–F3) | Configuración, automatizaciones, migración y capacitación de usuarios |
| Desarrollador HubSpot (integraciones y API) | ECG-026 Desarrollador HubSpot | Semi-senior / senior | 112 | ≈ 20 % | Outlook, Teams, SharePoint, conector Wazuh, respaldo vía API y factibilidad QAD |
| Especialista de seguridad e identidad (Entra ID / SIEM) | ECG-015 Desarrollador Full Stack Senior (*proxy*: V3 no tiene un perfil de seguridad) | Senior | 40 | ≈ 8 % | SSO, Acceso Condicional, OAuth, Zero Trust y evidencias |
| Analista de datos (migración) | ECG-019 Data Analyst | Semi-senior | 16 | ≈ 3 % (concentrado en F3) | Limpieza y validación |
| Project manager | ECG-016 PM/Account Manager | Semi-senior | 50 | ≈ 10 % | Plan, riesgos, actas e informes |

**Pendiente:** la asignación real de personas y su disponibilidad. Que haya un perfil en V3 no acredita que esa persona exista ni que tenga capacidad libre. El proxy de seguridad también hay que confirmarlo: si no hay nadie interno con experiencia en Entra y Wazuh, se declara como capacidad a reforzar.

---

## 3. Precio preliminar

### 3.1 Licencias HubSpot (las paga el comprador directamente a HubSpot)

**Lista pública verificada el 05/11/2026** en [hubspot.com/pricing/sales](https://www.hubspot.com/pricing/sales) y en el [catálogo de productos](https://legal.hubspot.com/hubspot-product-and-services-catalog):

| Concepto | Professional | Enterprise |
| --- | --- | --- |
| Precio por asiento | USD 90/mes con compromiso anual (USD 100 mes a mes, según fuentes terceras) | USD 150/mes, compromiso y facturación anual (la página oficial lo publica como USD 1.800/año) |
| Onboarding obligatorio de HubSpot | USD 1.500, único | USD 3.500, único |
| Mínimo de asientos | Fuentes terceras dicen 5 | Fuentes terceras dicen 10 (sin confirmación oficial) |

**10 asientos, año 1:**
- **Professional:** USD 10.800.
- **Enterprise:** USD 18.000.

**Onboarding waiver:** Efeonce tiene la Partner Certification, según confirmó el operador el 13/07/2026. Desde el 15/07/2026 eso permite eliminar el onboarding del contrato del cliente porque Efeonce asume la implementación (módulo 11 §2). Eso ahorra **USD 1.500 en Pro y USD 3.500 en Enterprise**. Hay que **confirmarlo con la PDM (Maria del Mar Castro)** antes de prometerlo por escrito.

**Microsoft (requisito de las bases: «indicar las licencias Microsoft requeridas»):**
- El Acceso Condicional exige **Entra ID P1**; el Acceso Condicional basado en riesgo exige **P2**.
- Muchos tenants ya lo tienen incluido en Microsoft 365 E3/E5 o Business Premium. Hay que verificar el licenciamiento actual de Fiordo en F0; no se cotiza a ciegas.
- Efeonce está **Verified en Microsoft AI Cloud Partner Program y es CSP Indirect Reseller Active**, vía Licencias OnLine (registro de partnerships, 20/10/2026). Puede proveer la licencia si falta, pero falta confirmar el circuito de cotización en SmartHub.
- Wazuh es software del cliente: no tiene costo de licencia para Efeonce.

**Interno:** la comisión de partner es el 20 % del MRR de la licencia, hasta 3 años. Eso es unos USD 2.160/año en Pro y USD 3.600/año en Enterprise. No es descuento ni precio para el cliente.

### 3.2 Servicios Efeonce

**V3 no se pudo usar como cotización.** El catálogo vigente (v14) tiene **sólo cuatro ofertas**: creative-managed-service, seo-aeo-managed-service, talent-assurance-staffing y performance-commerce-distribution. **No existe una oferta CRM/HubSpot de implementación.**
- Cotizar con una de las prácticas gestionadas sería clasificar mal el negocio.
- Cotizar con staffing sería vender personas por dedicación, cuando las bases compran un proyecto.
- La guía V3 lo trata como algo no modelado. No se forzó.

Las cifras salen de los **costos objetivo V3 de los perfiles** (USD/mes, confirmados por el CEO, con referencia Chile, vigentes desde el 11/10/2026), divididos por 180 h/mes. Se usa la misma regla de margen que las prácticas gestionadas: **objetivo 55 % y piso 45 % sobre venta**, como **supuesto**, porque no existe una política CRM. No se usó nómina.

| Perfil | Costo objetivo mes | USD/h | Horas | Costo |
| --- | --- | --- | --- | --- |
| Consultor HubSpot (ECG-027) | 11.175 | 62,08 | 72 | 4.470 |
| Implementador HubSpot (ECG-025) | 7.800 | 43,33 | 192 | 8.320 |
| Desarrollador HubSpot (ECG-026) | 3.625 | 20,14 | 112 | 2.256 |
| Full Stack Senior, proxy de seguridad (ECG-015) | 2.125 | 11,81 | 40 | 472 |
| Data Analyst (ECG-019) | 2.000 | 11,11 | 16 | 178 |
| PM (ECG-016) | 2.125 | 11,81 | 50 | 590 |
| Herramientas prorrateadas (M365, Notion, IA): **supuesto** | — | — | — | 400 |
| **Total costo F0–F7** | | | **482 h** | **16.686** |

El costo se separa en dos líneas, porque las bases piden implementación y capacitación por separado:
- **Capacitación (F6):** consultor 12 h + implementador 16 h + herramientas ≈ **USD 1.480**.
- **Implementación (F0–F5, F7 y puesta en marcha):** ≈ **USD 15.206**.

| Línea | Costo | **Precio con 55 % (lista sugerida)** | Precio con 45 % (piso) |
| --- | --- | --- | --- |
| Implementación y migración, con seguridad, integraciones y estabilización | 15.206 | **USD 33.800** | USD 27.650 |
| Capacitación (usuarios y administradores) | 1.480 | **USD 3.300** | USD 2.700 |
| Soporte y operación, meses 5–12: 8 h implementador + 4 h desarrollador + 2 h consultor + 2 h PM por mes, ≈ USD 600 de costo mensual | 4.800 (8 meses) | **USD 1.350/mes × 8 = USD 10.800** (55,6 %) | USD 1.100/mes × 8 = USD 8.800 |
| **Total servicios, 12 meses** | 21.486 | **USD 47.900 neto + IVA** | **USD 39.150 neto + IVA** |

- **Forma:** proyecto On-Demand más soporte mensual.
- **Factor On-Demand de V3 (+10 %):** no se aplicó. Si Julio lo quiere, la implementación pasa a unos USD 37.200.
- **Moneda:** USD. La moneda y el FX de presentación (CLP o UF) están pendientes; no se infiere la tasa.
- **IVA:** 19 % sobre los servicios de Efeonce. Las licencias las factura HubSpot.

### 3.3 Integración con QAD (opcional, cotizada aparte)

La construcción depende de la versión de QAD (Adaptive / Cloud con API, o on-premise con middleware) y del alcance (clientes, productos, pedidos o saldos).

- **Rango indicativo:** **USD 4.700 a 9.500**, para 80 a 160 h de desarrollador HubSpot y 8 a 16 h de consultor, con el mismo margen de 55 %.
- Se cierra después del informe de factibilidad de F4.
- Si exige sincronización bidireccional de alto volumen, se evalúa Data Hub (licencia HubSpot adicional), sin asumirlo.

### 3.4 Totales preliminares, año 1

| Escenario | Licencias HubSpot (a HubSpot) | Servicios Efeonce (lista) | Servicios Efeonce (piso) | **Total año 1 (lista)** |
| --- | --- | --- | --- | --- |
| **Sales Hub Professional** | USD 10.800 (+1.500 si no se aplica el waiver) | USD 47.900 | USD 39.150 | **USD 58.700** |
| **Sales Hub Enterprise** | USD 18.000 (+3.500 si no se aplica el waiver) | USD 47.900 | USD 39.150 | **USD 65.900** |

A los servicios se les suma IVA. Ninguno de los dos escenarios incluye la construcción de QAD ni las licencias Microsoft que pudieran faltar.

**Lectura:** el escenario Pro probablemente **no cumple** varios controles obligatorios de §4: la auditoría exportable a SIEM y los ambientes separados son, según lo conocido, características de Enterprise. La seguridad la verifica otro fork. Si se confirma, la recomendación es **ofertar Enterprise** y presentar Pro sólo como referencia, o no presentarlo. El sobrecosto de Enterprise es de USD 7.200 al año en licencias.

**Riesgo de competitividad:** USD 47.900 en servicios es exigente para 10 usuarios. Se justifica por el bloque de seguridad (Entra, Wazuh, respaldo inmutable y la prueba técnica), pero hay que contrastarlo con la competencia esperada: partners de Dynamics que se apoyan en Entra de forma nativa, y partners HubSpot locales. El piso del 45 % deja unos USD 8.750 de margen para negociar.

---

## 4. Diferenciadores verdaderos de Efeonce (con estado de verificación)

| # | Diferenciador | Estado | Uso |
| --- | --- | --- | --- |
| 1 | **HubSpot Gold Solutions Partner**, con 6 certificaciones en el perfil público | ✅ Readback del 06/10/2026 en el Solutions Directory (`hubspot-partner-readback-2026-10-06`); Gold válido hasta el 15/01/2027 | **Repetir el readback antes de enviar.** No decir «100+ implementaciones» ni «35+ certificaciones»: son claims propios del perfil y no se usan como pilar (benchmark del 30/08/2026). |
| 2 | **Partner certificado: elimina el onboarding obligatorio de HubSpot** (USD 1.500 Pro / USD 3.500 Ent) e implementa en vez de entrenar | ⚠️ Confirmado por el operador el 13/07/2026; falta confirmarlo con la PDM para este negocio | Primera lámina económica, después de confirmar. |
| 3 | **Negocio compartido registrado con HubSpot** (05/11/2026): co-venta con PDM y especialista en crecimiento | ✅ Registro creado; el especialista sigue sin asignar | No prometer apoyo de HubSpot hasta que esté asignado. |
| 4 | **Microsoft AI Cloud Partner Program Verified y CSP Indirect Reseller Active** | ✅ Registro del 20/10/2026 (CSP Partner ID 6857773) | Responde «licencias Microsoft requeridas». No se puede decir «Microsoft Gold» ni hablar de especializaciones. El anuncio público está programado para el 10/12, condicionado a Dynamics. |
| 5 | **Experiencia propia y operativa con Entra ID e integraciones Microsoft**: Greenhouse autentica con Microsoft Entra (Azure AD, SSO y SCIM), usa Microsoft Graph y opera un bot de Teams | ✅ Plataforma interna en producción | Mostrarlo como capacidad, no como caso de cliente. |
| 6 | **Dogfooding:** Efeonce opera su comercial sobre HubSpot (portal propio) integrado con su plataforma | ✅ | En la demo: «el portal real, no una demo». |
| 7 | **Casos HubSpot citables** | ⚠️ Con límites | **Reestructuración CRM en una inmobiliaria del Cono Sur:** Marketing Hub Pro + 35 asientos de Sales, **sólo anonimizado**. **Sales Hub Pro gestionado** en clientes de servicios (Ecoriles, ANAM): nombrarlos **requiere autorización**. **Caso Customer Agent de ANAM:** 56 % de reducción de carga, liderar con el 56 % y nunca con el 76 %; requiere autorización y no aplica directo a Sales Hub. |
| 8 | **Equipo in-house en Chile** (Providencia) con práctica RevOps & CRM, y licitación privada ganada vía Wherex (Sky, blog, 23/09/2026) | ✅ | La relación con Wherex sirve como prueba de proceso, no de CRM. |

**No usar:**
- El win rate partner-led del 40–50 %: no tiene respaldo en el CRM.
- El caso Berel como caso CRM: el servicio fue SEO y el cierre fue directo.

---

## 5. Pendientes de aprobación y validación

1. **Julio:** precio de lista y piso de los servicios (USD 47.900 / 39.150), si aplica el factor On-Demand, si el soporte va en 8 meses y la moneda de presentación.
2. **Edición:** Enterprise o Pro, según la matriz de seguridad que prepara otro fork.
3. **PDM HubSpot:** waiver del onboarding para este negocio, mínimos de asientos y posible descuento por pago anual adelantado.
4. **Capacidad:** personas reales para el consultor, el implementador, el desarrollador y la especialidad de seguridad; confirmar la experiencia en Entra y Wazuh.
5. **Gaps de V3:** no hay oferta CRM ni política de margen CRM. Registrarlo en `data/pricing/v3-operating/operational-gaps.json` cuando se autorice. Mientras tanto, estas cifras son hipótesis.
6. **Wherex:** fechas de cierre y consultas. Si se cobra comisión de adjudicación, entra al costo.
