# Medición Google Ads: alcance y estado

La arquitectura adoptada conecta la inversión de Google Ads con solicitudes comerciales, reuniones,
calificación y negocios, conservando la fuente y el nivel de evidencia de cada hecho. El 17-10-2026
se comprobó **acceso API de lectura de operador** a `686-253-9491`. La CLI local `pnpm google-ads`
ya consulta esa cuenta y ofrece gestión por planes. Conexión multiorganización, panel/API/MCP de producto
y sender de conversiones siguen pendientes.

El operador amplió expresamente la CLI a **lectura, creación y actualización**. Consultas: conexión,
cuenta, campañas, presupuestos, grupos, metadatos de anuncios, conversiones/objetivos y reportes por
fechas con moneda, cobertura y errores explícitos. Gestión: campañas Search, presupuestos, grupos,
acciones de conversión y objetivos, según catálogo cerrado de `discover`. Una escritura exige plan,
validación, confirmación del hash y recibo; la verificación posterior compara campos. Campañas/grupos
quedan PAUSED; activación, eliminación, creatividades e ingesta están fuera del catálogo inicial.

En Cloud se guardó la identidad **Efeonce** y sus enlaces públicos; la marca «Claude» queda como
antecedente del piloto. La verificación de Google de marca/scopes sigue pendiente. El grant Ads tiene
secreto propio; GA4 y GSC Efeonce conservaron sus grants y pasaron lecturas reales después del cambio.
Las pruebas live de esta sesión sólo consultaron: **ninguna escritura publicitaria ejecutada**.

Delta online del mismo día: Forms y agendas ya tienen implementación local del recibo Ads, contexto
consentido y canal EC reservado. Se crearon/verificaron las dos acciones nativas secundarias y los
borradores Web8/Server12 compilan. **Sin despliegue ni publicación, captura Ads OFF; no está activo**.
La afirmación anterior de cero escrituras corresponde al probe/CLI previo; este delta sí creó dos
acciones, sin enviar conversiones ni cambiar campañas. [Activación y límites](../../manual-de-uso/growth/activar-conversiones-google-ads.md).

El18/10 se completó la validación local/API y se preparó el
[paquete previo al release](../../operations/releases/google-ads-2026-10-18/README.md):499 pruebas
focales y32 escenarios Chromium con respuestas simuladas y sin envíos externos. Términos aceptados
confirmados por API; EC sigueOFF. Falta compatibilidad servida en hosts, protocolo GTM real y
aprobación del candidato completo. No se publicaron tags, políticas ni cambios de infraestructura.

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

La cuenta inicial es nueva: API confirmó `Efeonce - Agencia`, CLP y America/Santiago, con dos
acciones GA4 `HIDDEN`, ambas `primary_for_goal=false`, y estado `NOT_CONVERSION_TRACKED`.
La lectura usa el manager `9531478329` como ruta de acceso al anunciante autorizado. No habilita
otras cuentas ni activa campañas.

La evolución comienza por conexión y lectura de producto, luego identidad/intención/consentimiento,
medición online y por último hitos CRM con emisor y valor aprobados por acción. El
[ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) define las decisiones;
la [arquitectura completa](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
define fases y gates. [Evidencia de acceso](../../audits/growth/2026-10-17-google-ads-api-discovery.md)
y [manual del operador](../../manual-de-uso/growth/conectar-google-ads-con-agentes.md).
