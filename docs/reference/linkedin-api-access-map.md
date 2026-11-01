# LinkedIn APIs — mapa de acceso para Efeonce

- **Estado:** referencia de investigación, **2026-10-31**. Sale de la lectura de la documentación oficial de
  LinkedIn para desarrolladores (Microsoft Learn) hecha por tres subagentes. No se creó ninguna app, no se
  pidió ningún producto y no se probó ninguna llamada.
- **Owner:** Growth / Measurement, con RevOps, Commercial y Platform.
- **Integración en código:** ninguna. `src/`, `services/` y `scripts/` no llaman a la API de LinkedIn.
- **Relación:** complementa el ADR [LinkedIn Ads — arquitectura de medición](../architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
  (`Proposed`), que cubre Insight Tag y Conversions API, y la
  [política de Sales Navigator](../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md), que gobierna la
  prospección manual. Este documento responde otra pregunta: **qué API existe, cómo se obtiene acceso y cuál
  le sirve a Efeonce.**
- **Vigencia:** LinkedIn cambia productos y versiones cada mes. Antes de construir, releer las fuentes y
  actualizar la fecha de arriba.

## Conclusión

Para publicar y medir en páginas de empresa, leer el rendimiento de anuncios de clientes y pasar leads a
HubSpot hay una vía real, pero todas pasan por revisión de LinkedIn. Sin aprobación solo están disponibles
iniciar sesión con LinkedIn y publicar como la persona que inició sesión. Leer perfiles de terceros,
enriquecer el CRM y publicar vacantes desde el ATS de Greenhouse están cerrados o reservados a partners.

## Cómo se obtiene acceso

1. **Revisar el caso de uso contra los usos prohibidos** (sección «Reglas»). LinkedIn no aprueba nada que use
   datos de personas para prospección, enriquecimiento de CRM, armado de audiencias, scraping ni para mostrar
   publicaciones en un sitio web.
2. **Ficha de empresa lista:** persona jurídica registrada, sitio web, política de privacidad pública y correo
   corporativo verificado. Un correo personal (Gmail) se rechaza.
3. **Crear la app** en developer.linkedin.com → My apps.
   - El nombre no puede incluir «LinkedIn», «Microsoft», «Linked» ni «In».
   - Se asocia a una página de LinkedIn, con logo y URL de política de privacidad.
   - **La asociación con la página es permanente.**
4. **Verificar la app:** el superadministrador de la página la aprueba dentro de 30 días.
5. **Configurar Auth:** URLs de retorno HTTPS, absolutas, sin `#` y con coincidencia exacta (los parámetros
   de consulta se ignoran).
6. **Pedir productos en la pestaña Products.** Una app nueva no tiene ningún permiso. Los productos con
   revisión piden formulario y encuesta. Una solicitud vence a los 21 días; si vence o la rechazan, desde
   2026-05 existe el botón «Reapply».
7. **Construir en nivel Development y pedir Standard** con un video de la integración funcionando.

Desde el 2026-06-30 el soporte ya no se pide por Zendesk; seguir la ruta que indique el portal.

## Catálogo de APIs

| API | Para qué | Cómo se accede | ¿Le sirve a Efeonce? |
|---|---|---|---|
| Sign In with LinkedIn (OpenID Connect) | Iniciar sesión: nombre, foto y correo (`openid`, `profile`, `email`) | Autoservicio, inmediato | Sí, como forma adicional de entrar a Greenhouse. No verifica identidad |
| Share on LinkedIn | Publicar como la persona (`w_member_social`) | Autoservicio; 150 publicaciones al día por persona, 100 000 por app | Sí, pero no lee métricas de esas publicaciones |
| **Community Management** | Publicar, comentar y medir en páginas de empresa: seguidores, visitas y publicaciones (`/rest/posts`, imágenes, videos, documentos, estadísticas, `organizationAcls`) | Revisión. Development: 500 llamadas al día por app y 100 por persona. Standard: video narrado de cada caso de uso | **Sí**, para la página propia y las de clientes |
| **Advertising** | Cuentas, campañas, anuncios, segmentación y presupuestos (`r_ads`, `rw_ads`, `*_boost` desde 202610) | Revisión. Development: lee todas las cuentas que la persona administra y edita hasta 5, con 1 cuenta de prueba. Standard: ticket y video; hasta 30 días hábiles | **Sí**. Development basta si solo leemos |
| **Reporting (`adAnalytics`)** | Rendimiento de anuncios, con atribución de ingresos si HubSpot está conectado a Business Manager (`r_ads_reporting`) | Viene con Advertising | **Sí**: es el reporte central para clientes. Máximo 15 000 elementos por respuesta, sin paginación |
| **Lead Sync** | Formularios de leads de LinkedIn hacia el CRM (`r_marketing_leadgen_automation`) | Revisión estándar, sin niveles. Desde 2026-03-16 solo con webhooks HTTPS validados | **Sí**. Antes, confirmar si basta el conector nativo de HubSpot (inferido, no verificado) |
| **Conversions API** | Enviar conversiones online y offline (`rw_conversions`) | Token directo sin vencimiento desde el Campaign Manager de cada cliente (Signals Manager → Direct API), sin app; o vía app aprobada | **Sí**; lo cubre el ADR de medición |
| Matched Audiences | Subir audiencias y retargeting (`rw_dmp_segments`) | Revisión; exige tener Advertising antes. Disponible para todos desde 2026-08 | Solo si subimos audiencias de clientes |
| Events Management | Crear y gestionar eventos (`rw_events`) | Autoservicio, a pedido | Opcional |
| Live Events | Transmitir en vivo | Solicitud (Development → Standard); el emisor debe estar aprobado | Opcional |
| Audience Insights / Media Planning | Datos de audiencia y planes de medios | Restringido, caso a caso | Poco probable que lo aprueben |
| Company Intelligence, Compliance | — | Cerrados a nuevos solicitantes | No |
| Talent: Job Posting, Apply with LinkedIn, Apply Connect, Recruiter System Connect, CRM Connect | Publicar vacantes y recibir postulaciones desde un ATS | Job Posting y Apply with LinkedIn cerrados a nuevos partners. El resto solo para ATS partners certificados cuyos clientes tienen LinkedIn Recruiter. Talent Hub se retiró el 2024-12-31 | **No**: no hay vía directa desde el ATS de Greenhouse |
| Sales Navigator (SNAP) | Datos de Sales Navigator | Cerrado a nuevos partners | No. La alternativa es la integración nativa LinkedIn ↔ HubSpot (Sales Navigator Advanced Plus + Sales Hub Professional o superior): una licencia, no algo que construyamos |
| Verified on LinkedIn | Mostrar verificación de identidad y lugar de trabajo | Development y Lite cerrados a nuevos desarrolladores (guía del 2026-10-14). Plus exige acuerdo comercial | No; además prohíbe usarlo para decisiones de contratación |
| Perfiles de terceros y contactos (Profile, Connections) | Leer perfiles o redes ajenas | Solo desarrolladores aprobados | No; no hay vía abierta para enriquecer el CRM |
| Learning | Cursos de LinkedIn Learning en un LMS | Learning Partner Program o licencias corporativas de Learning | Solo si las compramos |
| Portabilidad de datos (DMA) | Descargar datos de personas o de páginas | Personas: solo miembros del Espacio Económico Europeo (y Suiza en la versión Member). Páginas: solicitud con verificación de empresa, unos 7 días hábiles | No para Chile; la versión para páginas está sin confirmar fuera de la UE |

## Reglas que condicionan el diseño

### OAuth y tokens

- **Todo el marketing usa OAuth de 3 patas:** lo autoriza siempre una persona real. LinkedIn indica que el
  flujo de 2 patas (client credentials) no existe para ningún caso de marketing.
- La persona acepta todos los permisos pedidos o ninguno.
- El código de autorización dura 30 minutos y el token de acceso 60 días.
- El token de renovación dura 365 días y **no** se reinicia al usarlo. Se entrega a apps de marketing
  aprobadas; una página dice «un grupo limitado de partners» (ver «Dudas abiertas»).
- Endpoints: `https://www.linkedin.com/oauth/v2/authorization`, `https://www.linkedin.com/oauth/v2/accessToken`,
  `GET https://api.linkedin.com/v2/userinfo` y JWKS en `https://www.linkedin.com/oauth/openid/jwks`.
- El ID token es RS256 con `sub` por app (pairwise). El `email` puede faltar.
- Desde 2025-12-02 la persona puede entrar a LinkedIn con Google, Apple o passkey; en algunas plataformas
  hace falta `enable_extended_login=true`.

### Roles

El permiso de la app no basta: la persona que autoriza necesita el **rol** correcto.

- Página: ADMINISTRATOR, CONTENT_ADMIN, DIRECT_SPONSORED_CONTENT_POSTER, LEAD_GEN_FORMS_MANAGER, CURATOR,
  ANALYST. Se consulta con `/organizationAcls`.
- Cuenta de anuncios: ACCOUNT_BILLING_ADMIN, ACCOUNT_MANAGER, CAMPAIGN_MANAGER, CREATIVE_MANAGER, VIEWER.
  Se consulta con `/adAccountUsers`.
- El acceso a una página se da en la interfaz de LinkedIn; **no se puede otorgar por API**.

### Agencia: una persona real por cliente

Los términos prohíben perfiles falsos o «headless» y **usar un perfil individual para gestionar las cuentas de
varios clientes**. Cada cliente autoriza con una persona que tenga rol en su página o cuenta de anuncios, o
personas reales de Efeonce reciben esos roles. Nunca un perfil genérico que opere a todos los clientes.

### Community Management va en su propia app

Community Management debe ser el **único producto** de su app. Ruta: app aparte → conseguir Standard →
pedir que lo sumen a la app de anuncios citando el client ID de la app aparte. Si lo rechazan, hace falta una
app nueva.

### Versiones

- Las APIs de marketing van a `https://api.linkedin.com/rest/` con los headers `LinkedIn-Version: YYYYMM`
  (vigente: 202610) y `X-Restli-Protocol-Version: 2.0.0`.
- Hay una versión por mes y cada una vive al menos un año. **La 202511 deja de funcionar el 2026-11-16.**
- Las APIs de marketing sin versión se deprecaron el 2024-12-16; `ugcPosts` se reemplazó por `/rest/posts`.
  Las APIs de consumidor siguen documentadas en `/v2`.

### Cuotas

- Dos límites diarios: por app y por persona dentro de la app. Se reinician a medianoche UTC y devuelven 429.
- Los límites estándar no se publican: se ven en la pestaña Analytics de la app. Los administradores reciben
  un correo al llegar al 75 % del límite de la app.
- Los términos fijan 100 000 llamadas al día por defecto para productos de autoservicio.
- Hoy las APIs son gratis, pero los términos (§8.2) permiten que LinkedIn empiece a cobrar.

### Almacenamiento máximo (marketing)

| Dato | Plazo |
|---|---|
| Perfiles de otras personas | 24 horas, solo en caché |
| Actividad social de personas | 48 horas |
| Actividad social de organizaciones | 6 semanas; 6 meses si la organización autenticó |
| Reportes de páginas y anuncios | 1 año |
| Respuestas de Lead Gen Forms | Sin límite |

### Usos prohibidos

- Usar datos de personas para publicidad, ventas, reclutamiento, enriquecimiento de CRM o ABM.
- Exportar o combinar datos de personas; armar feeds sociales o incrustar publicaciones en un sitio web.
- Scraping, reventa, reidentificación, decisiones de crédito, seguros, empleo o vivienda, vigilancia y
  publicación automatizada.
- Los incidentes de seguridad se notifican dentro de 24 horas y LinkedIn puede auditar.

## Ruta recomendada para Efeonce

Recomendación de esta investigación; no es una decisión aceptada.

1. **App A, de anuncios:** Advertising en nivel Development, Lead Sync y, si hace falta, Conversions. Cubre
   reportes de clientes y leads hacia HubSpot. Standard solo se necesita para operar campañas en más de
   5 cuentas. La Conversions API puede usar el token directo de cada cliente sin pasar por la app.
2. **App B, solo con Community Management:** Development y luego Standard con el video. Antes, decidir si vale
   el trámite: hoy Efeonce publica en LinkedIn por Metricool.
3. **Sign In with LinkedIn:** solo si se quiere como forma adicional de entrar a Greenhouse, como proveedor de
   identidad enlazado a una identidad existente por `sub`, sin depender de que llegue el correo.
4. **Descartado:** publicar vacantes desde el ATS, enriquecer el CRM con perfiles y verificar candidatos.

Cualquier almacenamiento debe respetar los plazos de la tabla de almacenamiento, y cada token se guarda en
Secret Manager vía `*_SECRET_REF`, nunca en código.

## Dudas abiertas

- **Verified on LinkedIn, nivel Development:** dos fuentes se contradicen. La guía del 2026-10-14 dice que ya no
  se puede pedir; se tomó esa por ser la más reciente.
- **Roles para `w_organization_social`:** dos páginas listan roles distintos. Confirmarlo en la práctica.
- **Token de renovación:** una página lo da a todas las apps de marketing aprobadas y otra a «un grupo
  limitado de partners».
- **`profile` y el titular:** no está claro si incluye el headline; asumir que no.
- **Marketing Partner Program:** la página oficial no publica niveles ni requisitos para postular.

## Fuentes

- [Modelo de acceso y permisos abiertos](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [Productos de marketing, permisos y niveles](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access)
- [Usos prohibidos](https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases)
- [Almacenamiento de datos](https://learn.microsoft.com/en-us/linkedin/marketing/data-storage-requirements)
- [Revisión de Community Management](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review)
- [Versiones de las APIs de marketing](https://learn.microsoft.com/en-us/linkedin/marketing/versioning)
- [Índice de la documentación](https://learn.microsoft.com/en-us/linkedin/)
