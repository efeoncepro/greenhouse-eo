# Efeonce Auth y Rooms — revisión técnica de privacidad V2

Fecha: 2026-10-25. Dueños propuestos: Identity / Platform para controles técnicos; responsable de privacidad y
responsable de negocio por designar. TASK-1833 / EPIC-044; consumers TASK-2065/2066, issuer TASK-1834/2067.
Estado: **revisión técnica preparada; decisiones de tratamiento, plazos y aprobación responsable pendientes**.
No constituye opinión jurídica, certificación, firma del responsable ni aprobación de una organización cliente.
No solicita ni presupone contratación externa. La evaluación de seguridad propia tiene expediente separado.

## Alcance y evidencia

Esta V2 sustituye el análisis técnico activo de la [V1](EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md), que se
conserva como historia de la alternativa WorkOS descartada. El emisor es propio; eso no elimina proveedores:
GCP opera infraestructura y Resend recibe el correo transaccional. La afirmación histórica de que todos los
datos permanecen dentro de GCP no describe el envío de invitaciones actual.

El inventario deriva de código, migraciones y contratos locales. **Describe estructuras capaces de tratar datos,
no personas existentes, conteos ni tratamientos efectivamente activados.** No se consultó PII cloud ni se
realizaron nuevas consultas SQL, envíos o mutaciones para esta revisión. La metadata operativa previa se referencia
con fecha en el [preflight TASK-2067](../audits/identity/TASK-2067-production-preflight-2026-10-25.md).
El checkout compartido contiene implementación aún pendiente de promoción; flags OFF, migración presente en
Git, test local y runtime productivo son estados distintos.

Fuentes principales:

- [Emisor nativo](../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md),
  [OAuth](../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md),
  [entrada por RP](../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md),
  [OTP](../architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md).
- [Acceso Rooms](../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md),
  [stack Rooms](../architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md).
- Migraciones `20260904104914802_task-1631-*`, `20260904111156246_task-1828-*`,
  `20260904130826694_task-1829-*`, `20260904184837565_task-1830-*`,
  `20260904202029472_task-1830-*`, `20260904205119719_task-1830-*`,
  `20260905124526557_task-1836-*`, `20260905130319708_task-1836-*`,
  `20261025212915003_task-1834-*`, `20261025213415654_task-2067-*` en `migrations/`.
- Código `src/lib/auth-server/{persons,internal,oauth,first-party,email-otp,maintenance,keys}/`,
  `src/lib/email/delivery.ts`; sibling `../efeonce-rooms/src/server/{auth,invitations}/` y sus migraciones
  `1792964148932_rooms-oidc-consumer.sql`, `1792964574644_rooms-invitations.sql`,
  `1792964731337_rooms-invitation-issuer-binding.sql`.

## Flujos y límites de finalidad

1. **Acceso corporativo first-party:** Auth autentica; el producto recibe identidad verificable y resuelve su
   autorización canónica. OIDC no concede por sí mismo acceso a una organización. Rooms conserva bindings,
   membership y grants propios. La pantalla compartida de login no transforma todos los productos en una base
   única de autorización ni convierte sesiones por host en una cookie global.
2. **OAuth delegado/MCP:** consentimiento por cliente, scopes, audiencia y contexto de autorización. Ese
   consentimiento técnico no equivale automáticamente a la base jurídica de todo tratamiento ni a consentimiento
   comercial. La entrada first-party suficiente no exige la pantalla de consentimiento delegado.
3. **Invitado Rooms:** un owner autorizado crea invitación a destinatario concreto. Rooms entrega al issuer por
   S2S una referencia canónica; Auth resuelve destinatario y enlace, genera OTP y envía un correo con ambos.
   El código se introduce en Rooms; la verificación S2S devuelve proof firmado con audiencia, versión, nonce y jti.
   Rooms consume proof/transacción y crea sesión guest limitada. No crea sesión SSO global ni afirma identidad
   de un perfil sin binding. Enlace y código por el mismo correo **no se presentan como MFA**.
4. **Seguridad y soporte:** trazas mínimas de intentos, cambios de autoridad y entrega permiten revocar y
   diagnosticar. No se reutilizan implícitamente para marketing, scoring comercial o vigilancia del contenido.
   El contrato Rooms exige decisión explícita de finalidad/retención antes de analytics de comportamiento.

## Inventario técnico y retención observada

Los identificadores opacos, hashes de email/IP, sujetos y claves públicas vinculadas a una persona no se tratan
como datos anónimos. Cifrar o hashear reduce exposición, pero conserva posibilidad de vinculación.
**TTL es validez de una credencial; retención es permanencia del registro.** La caducidad no prueba borrado.

| Almacén / tablas | Datos y propósito | Validez / borrado implementado | Decisión pendiente |
| --- | --- | --- | --- |
| `greenhouse_core.external_identity_environments`, `external_organization_bindings`, `external_capability_grants`; enlaces/perfiles canónicos asociados | Issuer, organización, perfil, autoridad y vigencia; resolver acceso | Estado/revocación y vigencias; GC Auth no elimina este directorio | Baja, conservación contractual y supresión coordinada con owners de identidad |
| `greenhouse_core.external_member_invitations` | Email y email normalizado, referencias de persona/organización, invitación y estado | Expiración/revocación no equivalen a purga; fuera de GC Auth | Plazo y tratamiento de invitaciones no aceptadas/revocadas |
| `external_identity_audit_log`, `external_access_resolution_log` | Actor, referencias, decisiones y eventos de acceso | No cubiertos por GC efímero revisado | Plazo por finalidad, acceso de soporte y política de preservación |
| `greenhouse_auth.sessions` | Hash de cookie, sujeto/perfil/link/entorno, amr, tiempos, hashes IP/UA | Defaults: 12 h deslizantes, máximo 7 d; GC usa expiración absoluta anterior al cutoff y dependencias | Validar adecuación del mínimo de 30 d tras expiración y capacidad de purga |
| `magic_link_tokens`, `passkey_challenges`, `auth_rate_limits` | Hash de token/reto/email/IP, sujeto y contadores | Magic link 15 min; reto passkey 5 min; GC por expiración o último uso/bloqueo anterior al cutoff | Justificación de 30 d; revisar inferencia de hashes en datasets accesibles |
| `passkey_credentials` | ID, clave pública COSE, contador, transports, nombre opcional de dispositivo, AAGUID y estado | Revocación disponible; no purga en GC revisado; clave privada no almacenada en esta tabla | Retención tras revocación, minimización de nombre y metadata de dispositivo |
| `totp_enrollments`, `totp_backup_codes` | Secreto TOTP cifrado KMS, sujeto, estado; hashes de códigos de recuperación y consumo | Revocación y consumo; no purga en GC revisado | Plazo de material revocado y reenvoltura/retirada de claves; evitar exportar ciphertext innecesario |
| `person_auth_attempts`, `oauth_audit_events` | Eventos, resultado, sujeto/referencias, hashes IP/UA | Excluidos del GC efímero | Plazo justificado y procedimiento controlado de eliminación/preservación |
| `oauth_clients`, `cimd_cache` | Client IDs, redirect URIs, metadata de cliente y contactos cuando corresponda | Caché CIMD TTL máximo 24 h; no cubierta por GC base revisado. Registro de clientes duradero | Limpieza de caché y bajas; impedir PII innecesaria en metadata/URLs |
| `authorization_codes`, `access_tokens`, `refresh_tokens` | Hashes/jti, sujeto, cliente, scopes, contexto/familia, tiempos | Defaults: code 5 min, access 15 min, refresh 30 d deslizantes/90 d absolutos; GC respeta familia y dependencias | Retención posterior a expiración/revocación y tamaño del backlog |
| `client_consents`, `authorization_contexts`, `corporate_session_evidence`, `internal_login_transactions` | Contexto de autoridad, evidencia de sesión corporativa, consentimiento técnico y transacción | GC condicionado a expiración y dependencias; consents sin contexto elegible no se purgan por ese predicado | Política de consents persistentes y evidencias, independiente de base jurídica |
| `first_party_clients` | Cliente/producto, redirects autorizados, hash de secreto, estado | Registro duradero, fuera de GC first-party | Baja y conservación de registro de productos |
| `first_party_login_transactions`, `first_party_codes`, `first_party_access_handles` | Hash de transacción/code/handle, authorization URL, nonce/PKCE, sujeto y referencia de sesión | Code/handle SQL máximo 5 min; GC fijo 30 d después de expiración, con dependencias | Confirmar necesidad de authorization URL persistida; evitar PII en parámetros y trazas |
| `email_otp_challenges`, `email_otp_budgets` | Binding RP/invitación/versión/referencia opaca, MAC del OTP, hash destinatario/request, contadores | OTP máximo 10 min o menor vigencia canónica; historia de idempotencia 24 h; proof máximo 120 s. GC fijo 30 d después del `expires_at` almacenado | Justificar 30 d frente a finalidad antiabuso; no confundir ventana de idempotencia con purga |
| `signing_keys`, `signing_key_events` | Clave pública, versión KMS, estado/fechas y actor operativo | Registry y eventos preservados; rotación no elimina los eventos; no contienen llave privada | Plazo de trazabilidad y metadata de operador, proceso de retiro |
| `greenhouse_notifications.email_deliveries` y persistencia del dispatcher | **Email destinatario persistido**, tipo, estado, correlación y metadata de entrega | `token_sensitive` elimina cuerpo/contexto sensible y retry genérico; no elimina email destinatario ni metadata. No se constató purga específica en el código de correo revisado | Plazo de delivery/suppression/eventos y reconciliación con Resend; inventario completo de tablas notificadoras |
| `rooms.identity_bindings`, `rooms.principals`, `rooms.memberships`, `rooms.grants` | Sujeto/issuer, organización/principal y autoridad | Expiración/revocación; no purga demostrada de estas clases | Política de baja y preservación de relaciones históricas |
| `rooms.auth_transactions`, `rooms.sessions`, `rooms.auth_events` | State/browser/cookie hashes, nonce, verifier/handle cifrados, sujeto y contexto; eventos sin sujeto directo en auth_events | Transacción/sesión máximo 300 s por SQL. `collectExpiredAuth` borra expirados hace >1 d y eventos >30 d, invocado al comenzar autenticación | Limpieza depende del tráfico; no es SLA periódico; medir carga y ofrecer owner programado |
| `rooms.invitations` | Email **cifrado reversible**, token hash y token cifrado, recipientReference, sala/organización/owner, capabilities, issuer/client/origin y versión | Caducidad/revocación/reemisión; no borrado físico demostrado | Política y mecanismo para ciphertext de email/token después de vencimiento/revocación |
| `rooms.invitation_transactions`, `invitation_sessions`, `invitation_proofs`, `invitation_rate_limits` | Hash de cookie, challenge, nonce, jti consumido, versión y contadores | Transacción máximo 10 min; sesión guest default 15 min, tope SQL/config 1 h y límite de autoridad. Proofs append-only con trigger que bloquea DELETE; no GC de estas clases hallado | Purga ordenada compatible con antireplay, FKs y trazabilidad; retención no resuelta por TTL |
| `rooms.audit`, `command_receipts`, `outbox`, ediciones y notas | Evidencia de comandos y contenido potencialmente personal, separado de autenticación | Inmutabilidad/archivo no equivalen a supresión | Política del producto/contenido por clase; no afirmar ausencia de datos sensibles en texto libre |

### Qué ejecuta realmente el GC

`src/lib/auth-server/maintenance/gc.ts` llama la función SQL `gc_ephemeral_state`, con default dry-run, batches
máximo 500 por tabla y retención mínima 30 d. El worker invoca apply con 30 d; el preflight del coordinador
observó el scheduler base horario activo. Las nuevas extensiones first-party y OTP se incorporan en código local,
comprueban existencia de función y devuelven `not_migrated` si no existe; con retención mayor de 30 d se omiten
como `retention_mismatch`, sin reducir el plazo solicitado. No afirmar que estas extensiones ya corrieron en cloud.

La función base elimina 11 clases efímeras con orden/dependencias; no purga auditoría, intentos, autenticadores
ni registro de clientes. Las extensiones agregan tres tablas first-party y dos OTP. Locks, batches y dependencias
pueden posponer el borrado más allá del cutoff: **30 d es umbral de elegibilidad, no garantía de eliminación exacta**.
Backups, PITR, logs de infraestructura y copias de proveedores no se borran con DELETE de la tabla primaria.
Sus plazos y procedimiento tras restauración no se verificaron aquí.

## Minimización y circulación del correo

El core OTP persiste HMAC del código; no OTP en claro, email en claro, enlace o proof en sus tablas. El mailer
recibe esos datos efímeramente y entrega el correo a `sendEmail` gobernado. El schema rechaza campos sensibles
superiores conocidos, pero no debe interpretarse como validador universal de cualquier JSON anidado: los ports
estrechos, tests y control de writers conservan importancia.

El correo sí sale hacia Resend y al sistema de correo del destinatario: contiene destinatario, etiqueta de sala,
enlace y código. El pipeline token_sensitive persiste destinatario normalizado y metadata mínima, **no el cuerpo
ni el enlace/código**; no hay retry durable del payload sensible. La etiqueta de sala debe ser apta para correo.
El proveedor y el buzón son superficies con políticas propias; no se verificó borrado ni retención de sus cuerpos.

El sender OTP local exclusivo es `Efeonce <acceso@mail.efeoncepro.com>`. GET de metadata del preflight, tanto con
la referencia staging actual como con la producción prevista, confirmó el mismo dominio verified/sending enabled
con click/open tracking OFF. Eso no demuestra entrega, preservación del href recibido ni ausencia de escáneres
del buzón. El dominio raíz conserva tracking ON para otros tipos; no extender la afirmación OTP a toda la agencia.

El enlace `https://<origen-exacto>/invite#token=<opaco>` deja el bearer en fragmento: el frontend Rooms lo toma en
memoria, limpia history y lo intercambia por POST. No ponerlo en query/path, analytics, screenshots, errores,
referers construidos a mano o recibos. Es un secreto visible al usuario y al sistema de correo; el fragmento no
elimina ese riesgo. Los receipts S2S no incluyen OTP; el proof no contiene email, perfil ni roles.

## Accesos, proveedores y residencia

| Componente / destino | Evidencia técnica | Límite de la evidencia y decisión |
| --- | --- | --- |
| Auth Cloud Run, Cloud SQL, KMS | Preflight2026-10-25: proyecto efeonce-group, us-east4; DB greenhouse-pg-dev compartida; claves HSM | Región de recursos observados, no certificación de residencia integral ni ubicación de todas las copias/support |
| Rooms | Runtime y datos separados por contrato; código usa schema rooms y RP scoped | Inventario de despliegue, región DB, logs/backups y acceso operativo definitivo por completar con owner Rooms |
| Resend | Endpoint de envío externo; dominio mail en us-east-1; referencia producción accesible al runtime Auth | Región del dominio no demuestra ubicación de todos los logs, subprocessors ni retención. Revisar contrato/DPA y configuración aplicable |
| Entra/corporate login, navegador, consumidor MCP | Evidencia upstream y cookies/tokens por cada flujo; bindings canónicos | El inventario contractual debe contemplar cada integración efectivamente usada; no inferir necesidad de nuevos proveedores |
| Logs, observabilidad, edge y backups | Superficies posibles de datos de acceso/redacción y copias | No se inventaría aquí la totalidad de proveedores ni TTLs; owner Platform debe completar mapa y accesos |

Cloud IAM y SQL son controles distintos. El preflight observó `greenhouse_app` con CREATEROLE/CREATEDB y membresía
cloudsqlsuperuser, pese al canon runtime DML; finding separado, sin cambios ni explotación. `signing_keys` permite
INSERT/UPDATE a runtime según migración original: no drift nuevo, pero revisar segregación del control de
confianza. Owner de objetos Auth: greenhouse_ops. Los GC usan SECURITY DEFINER acotado, search_path fijo y PUBLIC
sin EXECUTE; no otorgan DELETE genérico sobre efímeros. Un administrador con acceso legítimo a SQL/cifrado sigue
requiriendo finalidad, trazabilidad y autorización proporcional.

## Borrador de registro de actividades de tratamiento (RAT técnico)

No es un registro firmado ni se afirma que satisfaga una norma específica. **Base jurídica, entidad responsable,
rol frente al cliente, destinatarios contractuales, jurisdicción, plazo aprobado y contacto de privacidad están
pendientes por actividad.** Ninguna fila presume consentimiento por el mero uso de login o por aceptar una invitación.

| ID | Actividad / propósito | Titulares y datos | Sistemas / destinatarios | Owner técnico propuesto | Retención técnica / aprobación |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Autenticación y sesión de persona | Personas internas/externas habilitadas; identificadores, credenciales públicas/cifradas, evidencia y sesión | Auth, GCP, upstream corporativo cuando aplique | Identity | TTL/GC de la matriz; política posbaja pendiente |
| AUTH-02 | Autorizar productos y delegación MCP | Personas con binding; sujeto, org, grants, contexto, consent técnico | Auth, producto RP o gateway autorizado | Identity + owner del producto | Vigencia y dependencias; conservación de consent/audit pendiente |
| ROOMS-01 | Invitar y dar acceso limitado a una sala | Destinatarios invitados y owners; email, referencias, sala y capabilities | Rooms → Auth → Resend → buzón destinatario | Rooms + Identity + Email Platform | OTP/sesión caducan; invitación, correo y proof requieren política de supresión |
| SEC-01 | Prevenir abuso e investigar incidencias | Usuarios/intentos; hashes y referencias, resultado, timestamps | Auth/Rooms y observabilidad gobernada | Platform Security | GC parcial; intentos/auditoría y logs pendientes de plazo |
| OPS-01 | Operar credenciales y entrega | Operadores y destinatarios; actor operativo, key metadata, delivery receipt | KMS/SQL/Secret Manager/Resend | Platform | Retención operativa por aprobar y prueba de borrado/restauración pendiente |

El RAT definitivo debe añadir fuente de datos, fundamento por jurisdicción, necesidad de cada categoría, periodo
por estado, derechos/canales, destinatarios y transferencias, proveedores/subencargados aprobados, medidas,
contratos/avisos versionados, responsable y fecha de aprobación. No mezclar personas de cliente con relación
laboral: la evaluación laboral pertenece a su owner y queda fuera de este documento.

## Solicitudes de titulares y revocación

Propuesta operativa, aún sin canal público ni SLA validado: recibir solicitud por canal aprobado, comprobar
identidad de forma proporcional, determinar organizaciones/roles y owners, localizar por referencias canónicas,
revisar preservación necesaria y responder con evidencia mínima. No pedir ni recibir OTP, cookies, recovery codes
o claves privadas para verificar al solicitante. No definir aquí un correo de privacidad inexistente.

La revocación canónica existe en distintos niveles: `revokeExternalAccess` (binding/member/grant/invitation),
`revokeInternalNativeIdentity`, `revokePersonAuthState`, `revokeClientConsent` y commands propios de Rooms.
Los endpoints/capabilities y pruebas esperadas están en el [runbook de incidentes](runbooks/auth-server-incident.md).
Revocar sesión, revocar autorización, rectificar un dato y suprimirlo son operaciones diferentes. No usar DELETE
ad hoc para simular el cumplimiento de todas; no exportar secretos al construir una respuesta de acceso.

Falta verificar un flujo completo de localización/exportación/rectificación/supresión coordinada con proveedores,
auditoría, backups y restores. TASK-1840 conserva logout/revocación multiproducto. La sesión guest requiere ensayo
de revocación con acceso previamente válido; un flag OFF impide operaciones nuevas pero no prueba baja universal.

## Incidentes y comunicaciones

El [runbook de incidentes](runbooks/auth-server-incident.md) y el de
[rotación](runbooks/auth-server-key-rotation.md) separan contención, revocación y rotación. Para un evento de
privacidad registrar fecha de conocimiento, clases de datos, sistemas, alcance confirmado/posible, contención,
riesgo y evidencia redactada. No adjuntar tokens, cuerpos de correo ni dumps. La ausencia de audit SQL durante
un fallo no prueba ausencia de incidente.

Designar responsables de evaluación, comunicación a cliente/titular/autoridad y preservación; comprobar la norma
y el contrato aplicables antes de fijar destinatarios y plazos. No aplicar un SLA universal de 72 h a todas las
jurisdicciones ni declarar simulacro completado por tener runbook. El expediente no acredita un incidente real.

## Marco normativo acotado y validación pendiente

Fuentes oficiales consultadas 2026-10-25. La BCN identifica la entrada en vigor de la Ley chilena 21.719 el
**1 de diciembre de 2026**, que modifica el régimen de la Ley19.628. El texto contempla finalidad,
proporcionalidad, seguridad y derechos de acceso, rectificación, supresión, oposición y portabilidad. Este memo
prepara evidencia técnica; no determina por sí solo base de licitud ni obligaciones de una entidad concreta.
Reverificar la versión vigente antes de aprobar avisos, contratos o plazos.
[BCN, Ley21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01).

La cobertura comercial en un país y la ubicación de un servidor no resuelven solas ley aplicable, rol contractual
ni transferencias. No se importan las conclusiones regionales de la V1 sin revisión. Para una eventual evaluación
UE, la referencia primaria es el [Reglamento2016/679](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679);
su aplicación no se da por hecha en este piloto. CL/CO/MX/PE/EEUU y otros mercados requieren decisión según el
flujo y contrato concretos; esta revisión no declara cumplimiento regional.

## Pendientes, owners y criterio de cierre

| Prioridad | Pendiente | Owner propuesto | Evidencia para cerrar |
| --- | --- | --- | --- |
| Antes de ampliar a clientes | Rol/base/finalidad y aviso por actividad; proveedor/contrato/transferencia | Responsable de negocio + privacidad | RAT aprobado con contratos/avisos referenciados y países aplicables |
| Antes de prometer borrado | Política por tabla, email, auditoría, proof append-only y backups | Identity + Rooms + Email + Platform | Plazos aprobados; mecanismo compatible con FKs/antireplay; prueba aislada y readback |
| Rollout | Promover migraciones y extensiones GC, verificar permisos y counts sin PII | Platform | Revisión/SHA, funciones presentes, resultado GC y backlog observable |
| Operación | Canal de solicitudes y flujo coordinado de respuesta | Privacidad + soporte + owners | Ensayo con datos sintéticos y responsable/plazos explícitos |
| Seguridad | Resolver roles SQL amplios y segregación del registro de llaves | Platform/DB/Identity | Decisión y cambio gobernado, pruebas de permisos; ningún revoke unilateral |
| Continuidad | Incidente y revocación ensayados; restauración sin reactivar acceso revocado | Platform + Rooms | Evidencia positiva/negativa y plan de comunicaciones aprobado |
| Proveedores | Retención de Resend, logs/cuerpo, backups y residencia completa | Platform + privacidad | Config/contrato verificado; no extrapolar región del dominio |

Revisión técnica entregada no cierra por sí sola TASK-1833, steady7d, evaluación de seguridad ni aprobación
responsable. Para decisiones jurídicas antes de firmar, publicar o tratar datos, validar con abogado habilitado
en la jurisdicción aplicable; es recomendación de la skill, no evidencia de contratación ni un servicio autorizado
por este documento. Handoff: Identity/Platform completan controles; el responsable designado decide tratamiento.
