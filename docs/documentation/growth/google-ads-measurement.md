# Medición Google Ads: alcance y estado

Checkpoint de release18/10 (19/10 02:11Z): main2559e9242 y deployment4He READY; fachada
Grader y clasificación administrativa servidas, canarios negativos PASS sin leads ficticios.
CI/Deep y cierre formal: [evidencia del release](../../audits/releases/2026-10-18-grader-commercial-measurement-production-release.md).

Verificación API18/10,22:57:03Z: **13 formularios comerciales y Discovery con Ads publicado**.
AI Grader incluido por decisión comercial del operador; Contacto general fuera de Ads. Lead Gen Web
corregido a quote_request con key/slug/versión/destinos preservados. Se publicaron12 formularios
adicionales; no se modificaron GTM, campañas, pujas o deployment. Primera recepción y atribución
siguen pendientes. [Publicación y evidencia](../../audits/growth/2026-10-18-commercial-forms-policy-publication.md).

## Antecedentes de configuración antes de ampliar cobertura


**Checkpoint 18/10, 20:43:28Z:** GTM Web **6** (`1792355588730`) y Server **10**
(`1792355562526`) publicados y releídos; EC **ON** en6862539491. Bridge `4250795666af…` servido
en ambos hosts. Performance y Discovery publicaron Ads rev2 con activación20:35Z, preservando los
destinos previos. El flag de proyecto quedó `true` a las20:36:20Z; el companion de main
`ec317c928fffcb919d71bdb62821b80280af2347`, `dpl_ER5v1bwisSTkfWE6BCd7jfJNLxvk`, está
**READY** con alias/SHA exactos y presencia de la clave en env/build. La cadena de configuración está
verificada; la API sólo expone nombres y no acredita por sí sola el booleano congelado ni una conversión. El protocolo Preview y cuatro casos del SDK live pasaron sin conversiones
externas; primera ocurrencia comercial, recibo proveedor y atribución siguen pendientes. E2E abierto.
[Auditoría de activación](../../audits/growth/2026-10-18-google-ads-activation.md).

## Cobertura comercial y fuentes futuras

**Performance** es el formulario de diagnóstico de pauta; **Discovery** es la agenda de descubrimiento.
Son nombres de fuentes del sitio. El tipo de campaña Ads no determina qué fuente tiene cobertura.
La cobertura vigente es13 formularios comerciales y Discovery, verificada por API.
Performance es uno de esos formularios; no limita la cobertura a dos fuentes.

El alcance solicitado para ampliar Forms comprende contacto, cotización, diagnósticos y briefs
**comerciales** que captan solicitudes de servicios. Se reutiliza la acción «Solicitud comercial
aceptada» y las etiquetas existentes, mediante política por fuente/versión/surface; no se necesita
una etiqueta por formulario. Ebooks, descargas, newsletter, postulaciones, soporte y pruebas quedan
fuera de esta ampliación. Discovery conserva su acción separada de reserva confirmada.

La publicación22:57Z dejó13 formularios comerciales y Discovery con Ads. AI Grader tiene intención
comercial confirmada; Contacto es general y queda fueraAds. Lead Gen Web ya es quote_request,
corregido sin cambiar versión/identidad. [Evidencia y límites](../../audits/growth/2026-10-18-commercial-forms-policy-publication.md).
El control de cobertura automática de formularios futuros sigue **propuesto**; la publicación de una
versión nueva requiere revisar su política. No se han cambiado objetivos ni pujas en esta ampliación.

La arquitectura adoptada conecta la inversión de Google Ads con solicitudes comerciales, reuniones,
calificación y negocios, conservando la fuente y el nivel de evidencia de cada hecho. El 17-10-2026
se comprobó **acceso API de lectura de operador** a `686-253-9491`. La CLI local `pnpm google-ads`
ya consulta esa cuenta y ofrece gestión por planes. Conexión multiorganización, panel/API/MCP de producto
y sender de resultados CRM siguen pendientes; el canal online GTM conserva su activación independiente.

El operador amplió expresamente la CLI a **lectura, creación y actualización**. Consultas: conexión,
cuenta, campañas, presupuestos, grupos, metadatos de anuncios, conversiones/objetivos y reportes por
fechas con moneda, cobertura y errores explícitos. Gestión: campañas Search, presupuestos, grupos,
acciones de conversión y objetivos, según catálogo cerrado de `discover`. Una escritura exige plan,
validación, confirmación del hash y recibo; la verificación posterior compara campos. Campañas/grupos
quedan PAUSED; activación, eliminación, creatividades e ingesta están fuera del catálogo inicial.

En Cloud se guardó la identidad **Efeonce** y sus enlaces públicos; la marca «Claude» queda como
antecedente del piloto. La verificación de Google de marca/scopes sigue pendiente. El grant Ads tiene
secreto propio; GA4 y GSC Efeonce conservaron sus grants y pasaron lecturas reales después del cambio.
Las pruebas live del probe/CLI del 17/10 sólo consultaron: **ninguna escritura publicitaria ejecutada en ese corte**.

Delta online del 17/10: Forms y agendas ya tienen implementación local del recibo Ads, contexto
consentido y canal EC reservado. Se crearon/verificaron las dos acciones nativas secundarias y los
borradores Web 8/Server 12 compilan. **En ese corte no hubo despliegue ni publicación; captura Ads OFF**.
La afirmación anterior de cero escrituras corresponde al probe/CLI previo; este delta sí creó dos
acciones, sin enviar conversiones ni cambiar campañas. [Activación y límites](../../manual-de-uso/growth/activar-conversiones-google-ads.md).

El 18/10 se completó la validación local/API y se preparó el
[paquete previo al release](../../operations/releases/google-ads-2026-10-18/README.md):499 pruebas
focales y32 escenarios Chromium con respuestas simuladas y sin envíos externos. Términos aceptados
confirmados por API; EC seguíaOFF. Faltaban compatibilidad servida en hosts, protocolo GTM real y
aprobación del candidato completo en aquel corte. No se publicaron tags ni políticas en esa validación.

**Checkpoint 18/10, 19:51Z: release de código RELEASED.** Main
`ec317c928fffcb919d71bdb62821b80280af2347`; CI/Deep/smoke PASS, orquestador [39159325900](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39159325900)
SUCCESS y manifest `ec317c928fff-33c067f4-bc76-4a21-a5e0-a37a99ac726b` released a las 19:51:25.548Z,
releído a las 19:51:44.315Z. Vercel Production `dpl_F13UyAaTEjkcttFKc7aZjjtgTFNt` READY y alias
releídos a las 19:49:59Z; health HTTP 200 y watchdog `ok`, 6/6 runtimes, `drift=0` y `dataMissing=0`.
Canario admin 7/7, bundles Forms/Meetings/CTA y dos negativos `private, no-store` PASS; sin crear lead
ni reserva. Schema de recibos aplicado; excepción específica de batch autorizada a las 18:53:53Z.
[Auditoría y límites](../../audits/releases/2026-10-18-full-develop-production-release.md).

En el checkpoint19:51Z, el flag Ads estaba ausente en Production (readback19:49:57.865Z) y el lector
exigía `true`: Ads conservaba OFF. GTM, opt-in por fuente, hosts, Preview y EC efectiva estaban
pendientes; su avance posterior se registra arriba. El deploy de código por sí solo no acredita
recepción ni atribución.

| Componente | Función en la arquitectura |
| --- | --- |
| Growth Forms / Meetings | Confirmar solicitudes y reservas, intención y consentimiento |
| HubSpot | Contactos, calificación, oportunidades y resultados comerciales |
| Growth Measurement | Decidir elegibilidad y conservar ocurrencia, acción, consentimiento e intentos |
| GTM web | Capturar señales permitidas de navegación y aceptación |
| GTM servidor | Medición online mediante tags GA4/Ads y reglas de consentimiento |
| Google Ads API | Inventario, configuración leída, objetivos y reporting |
| HubSpot nativo o Data Manager | Un único emisor elegido por acción para resultados comerciales posteriores |
| GA4 / GSC | Comportamiento web / visibilidad orgánica; fuentes analíticas separadas |

Una solicitud comercial aceptada, una reunión confirmada, un lead calificado y un negocio ganado
son hitos diferentes. El detalle de cada acción define cuál sirve para optimizar campañas y qué
valor tiene. Las postulaciones, newsletter y pruebas no se convierten en demanda comercial.
No se adopta automáticamente el `generate_lead` genérico como conversión de puja.

Cada solicitud conserva su propia identidad: una persona puede realizar varias solicitudes y
participar en varios negocios. La atribución requiere enlazar esos hechos con evidencia; el email
o la existencia de un contacto no bastan. Ads, GA4 y HubSpot pueden informar atribuciones distintas
por sus modelos y ventanas; no se suman como ventas adicionales.

La entrega comercial sigue funcionando aunque falle la medición. Estados de elegibilidad, envío,
recepción, procesamiento y atribución se muestran separados. Un recibo HTTP o un contador agregado
no confirma una conversión individual atribuida. Consentimiento negado o desconocido bloquea la
publicidad que corresponda y no impide enviar una solicitud comercial legítima.

En la lectura inicial del 17/10, la cuenta era nueva: API confirmó `Efeonce - Agencia`, CLP y America/Santiago, con dos
acciones GA4 `HIDDEN`, ambas `primary_for_goal=false`, y estado `NOT_CONVERSION_TRACKED` en aquel corte; no describe las acciones nativas ni EC del checkpoint actual.
La lectura usa el manager `9531478329` como ruta de acceso al anunciante autorizado. No habilita
otras cuentas ni activa campañas.

La evolución comienza por conexión y lectura de producto, luego identidad/intención/consentimiento,
medición online y por último hitos CRM con emisor y valor aprobados por acción. El
[ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) define las decisiones;
la [arquitectura completa](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
define fases y gates. [Evidencia de acceso](../../audits/growth/2026-10-17-google-ads-api-discovery.md)
y [manual del operador](../../manual-de-uso/growth/conectar-google-ads-con-agentes.md).


Grader: [ruta efectiva y fachada compatible](../../architecture/GROWTH_GRADER_COMMERCIAL_MEASUREMENT_V1.md).
Think usa Forms portátil v8; la ruta histórica conserva captcha/coste y mide sólo mediante la política
Forms y recibo post-persistencia. Estado del nuevo release en la auditoría enlazada, sin leads ficticios.
