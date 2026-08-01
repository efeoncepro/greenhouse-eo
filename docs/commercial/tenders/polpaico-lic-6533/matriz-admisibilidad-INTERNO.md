# Matriz de admisibilidad — Polpaico LIC-6533

> Interno. Estado a 2026-07-31. No es una autorización de presentación.

| Control | Evidencia disponible | Estado | Owner / siguiente acción |
|---|---|---|---|
| Identificación del oferente y representante | No revisado en este discovery | Pendiente | Legal/Commercial |
| Aceptación Código de Conducta y ética Polpaico | Documentos corporativos revisados | Revisar firma/aceptación requerida | Legal |
| Prevención del delito / compliance | Manual Polpaico revisado; documentación Efeonce no adjunta | Pendiente | Legal/Finance |
| Certificaciones Arquitecto Salesforce | No disponible | Bloqueante | Talent/partner Salesforce |
| Certificación Agentforce Specialist | No disponible | Bloqueante | Talent/partner Salesforce |
| Certificación Service Cloud | No disponible | Bloqueante | Talent/partner Salesforce |
| PM PMP o equivalente | No disponible | Bloqueante | Talent |
| Casos Agentforce comprobables | No disponible | Bloqueante | Commercial |
| Referencias de cliente autorizadas | No disponible | Bloqueante | Commercial/Legal |
| Capacidad de delivery Salesforce | No verificada | Bloqueante | Practice/partner |
| Alcance, cronograma y UAT | RFP define mínimos, no volúmenes ni fecha de go-live | Pendiente | Discovery con Polpaico |
| SLA, garantía e hypercare | Requeridos, sin parámetros | Pendiente | Delivery/Finance/Legal |
| Formato Wherex y anexos exigidos | Invitación + RFP; campos Wherex no inspeccionados en Chrome | Pendiente | Owner, sesión autenticada |
| Precio y margen | Sin cotización; pago 60 días | Bloqueante | Finance |
| Licencias/Flex Credits | Se deben separar, pero no hay SKUs/costos | Bloqueante | Salesforce/Finance |
| Garantías, multas y retenciones | No aparecen en RFP recibido; revisar condiciones Wherex/contrato | Pendiente | Legal/Finance |

## Validación de partnership Salesforce — revisión de correo 2026-07-31

| Control | Evidencia disponible | Estado | Lectura / siguiente acción |
|---|---|---|---|
| Ingreso al Consulting Program | Correo de Salesforce del 11/03/2025: Efeonce Group SpA aceptada como `Provisional Partner` | Confirmado histórico | Es partnership de consultoría; no equivale por sí solo a autorización de reventa |
| Due Diligence & Compliance | Correo de Salesforce del 10/03/2025: aprobación confirmada | Confirmado histórico | Verificar vigencia y refresh actual en Partner Community |
| Requisito de permanencia provisional | Mismo correo: mínimo 2 Consultant Certifications en 6 meses; operador confirma que actualmente no tiene certificaciones | Bloqueante confirmado | No asumir reactivación automática; evaluar certificación propia y/o equipo certificado vinculado a Efeonce |
| Estado actual, tier y Partner Account ID | No encontrado en correo ni documentación interna | Bloqueante | Consultar Partner Community / Partner Business Org |
| SPPA vigente aceptado | No encontrado | Bloqueante | Confirmar entidad autorizada, versión vigente y aceptación |
| Cloud Reseller / Reseller Agreement | No encontrado | Bloqueante para vender licencias | Confirmar si existe track de Cloud Reseller y acuerdo separado |
| Capacidad Agentforce/Service Cloud | No hay evidencia de certificaciones actuales ni referencias | Bloqueante para Polpaico | Vincular equipo certificado y casos comprobables o formalizar partner de delivery |
| Modelo comercial license-to-cash | No definido | Bloqueante | Confirmar quién cotiza, contrata, factura, cobra renovaciones y soporta licencias |

**Regla provisional:** hasta confirmar Cloud Reseller/Reseller Agreement, Efeonce puede posicionar servicios de implementación y acompañar la compra directa del cliente, pero no debe prometer ni facturar licencias Salesforce como reventa propia.

### Acción de recuperación iniciada — 2026-08-01

- Salesforce Partner Community: se solicitó recuperación para la identidad autorizada del operador; el portal confirmó que envió un enlace de restablecimiento.
- Salesforce username corporativo: el portal oficial confirmó la creación de una identidad corporativa nueva y el envío de instrucciones de acceso temporal. Esto crea identidad de acceso, no confirma reactivación del Partner Account histórico.
- Webassessor/certificaciones: se solicitó recuperación para la identidad histórica del operador y el portal confirmó el envío condicional del enlace.
- Pendiente: completar ambos enlaces desde los buzones correspondientes, verificar las 2 certificaciones requeridas y confirmar si están vinculadas al Partner Account de Efeonce.
- El operador confirma que actualmente no posee certificaciones Salesforce; la hipótesis de “2 certificaciones existentes” queda descartada.
- Outlook: el mensaje a Partner Community Support aparece en Elementos enviados a las 23:40, solicitando recuperar el Partner Account existente, vincular el nuevo usuario, confirmar estado/tier, SPPA, requisitos de reactivación y ruta Cloud Reseller.
- Verificación posterior en el mismo buzón/alias: no apareció todavía una respuesta reciente de Salesforce ni un correo nuevo de activación para la identidad corporativa; la búsqueda reciente devuelve “No encontrado nada”.
- 2026-08-03 23:44 aprox.: Salesforce Support envió al buzón/alias un correo de restablecimiento para la identidad corporativa; el enlace fue abierto exitosamente.
- La recuperación de identidad quedó detenida en una pregunta de seguridad de Salesforce: “¿Cuál es tu lugar de nacimiento?”. No se infiere ni se almacena la respuesta; la pestaña autenticada quedó en handoff para que el operador la ingrese directamente.
- Esta evidencia confirma que la identidad corporativa existe y es recuperable, pero todavía no confirma acceso al Partner Community, vigencia del Partner Account, certificaciones vinculadas ni autorización Cloud Reseller.
- No se aceptaron contratos, términos comerciales, cambios de perfil ni acciones de reactivación en nombre de Efeonce.
- 2026-08-04: evidencia visual aportada por el operador muestra sesión autenticada en Salesforce con el usuario Julio Reyes, aplicación “Ventas” y pantalla “Inicio de vendedor”. La identidad nueva ya puede entrar a Salesforce; esto no equivale a confirmar Partner Community, Partner Account histórico, certificaciones o autorización Cloud Reseller.
- Outlook confirma que el seguimiento generó un segundo caso Salesforce el 2026-08-01 03:48 UTC. Los números de caso se conservan en el sistema de soporte, no en git; no hay respuesta posterior con estado, tier, SPPA o Cloud Reseller.
- La bandeja también muestra un correo de Slack indicando que la organización “Efeonce Group SpA” tiene un espacio de trabajo Salesforce conectado. Se registra como evidencia de organización Salesforce creada/conectada, no como evidencia de Partner Account histórico ni de autorización comercial.
- Documentación oficial vigente de Salesforce revisada el 2026-08-04: Partner Community requiere un Salesforce login propio; al ingresar, el username y la org quedan asociados a un Partner Account específico. La restauración de un usuario revocado requiere un caso de Partner Support; el alta inicial puede tardar 5–8 días hábiles. Por tanto, el siguiente paso correcto es intentar el acceso/alta con esta org nueva y, si no aparece Efeonce Group SpA o existe conflicto, continuar por los casos ya abiertos sin crear un Partner Account duplicado.
- Nueva búsqueda en Outlook (2026-08-04): no hay respuesta de Partner Support posterior a los acuses de los casos existentes; sólo permanecen los correos de creación de caso, recuperación de contraseña y bienvenida de la org nueva.
- Hallazgo load-bearing en Outlook: el digest semanal de Salesforce Partner Community recibido el 2026-07-26 confirma membresía de la identidad histórica en “Official: Partner Community”. Los IDs de org y usuario se conservan fuera de git. Esto prueba que el partnership histórico mantiene una identidad; el problema es recuperarla/vincularla, no inscribirse desde cero.
- El correo de aceptación del 2025-03-11 confirma que Julio fue designado Key Contact y administrador de Partner Community de Efeonce Group SpA. También confirma el requisito provisional de 2 Consultant Certifications dentro de 6 meses y que los individuos certificados deben estar correctamente vinculados. Ruta operativa: recuperar primero la identidad histórica; desde Partner Community Admin invitar después a la identidad corporativa con permisos de Partnership/Education. Si la identidad histórica no puede recuperar su acceso, Partner Support debe restaurarla antes de esa invitación.
- Se intentó responder dentro del caso de seguimiento con la evidencia necesaria; Outlook Connector devolvió `403 AccessDenied` tanto para reply como para crear un borrador. No se envió un segundo correo por esa vía y no se considera completado el seguimiento adicional.
