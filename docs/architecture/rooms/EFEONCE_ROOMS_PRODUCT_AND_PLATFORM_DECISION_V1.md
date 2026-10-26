# Efeonce Rooms — ADR de producto y plataforma V1

- Status: **Proposed** — consolidado para revisión antes del go final de implementación.
- Date: 2026-10-07.
- Owner: Commercial / Product; Platform para arquitectura y operación; Creative/AXIS para dirección visual.
- Scope: Rooms, autoría, experiencia de comprador/champion, API/CLI/MCP, multimedia y límites del ecosistema.
- Reversibility: two-way-but-slow.
- Confidence: high en propósito y frontera; medium en arquitectura propuesta; experiencia visual pendiente de prototipo.
- Validated as of inicial: 2026-10-07; conversación, fuentes locales y documentación técnica; entonces sin runtime Rooms.
- Depends on: [frontera propia aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md).

## Continuidad de ejecución 2026-10-26

El status `Proposed` pertenece al ADR consolidado completo; no borra los go parciales fechados de este
mismo documento ni acepta por inferencia toda la experiencia. Backend/API/CLI y medios cloud están en
main `e4b2e890`, con canary real completado/cerrado y worker automático verificado. [Dossier y evidencias](README.md).

Claude Design posee la interfaz; integración y aceptación humana pendientes. Sólo dispatch de máquina
ON; acceso/invitación/medios web OFF. Auth deploy-control permanece en PR263/264 por instrucción
expresa, sin merge/deploy ni release262. PDF/audio/video, presentación, colaboración, CRM y MCP
conservan el alcance futuro de la épica; una base ejecutable no equivale al cierre del producto.

## Context

El operador requiere un instrumento reutilizable para demostrar método, creatividad y técnica con propuestas completas: piezas estáticas en proporciones diversas, piezas largas, audio, video y PDF. El champion suele conducir la presentación interna y necesita herramientas para comprender, ensayar, presentar y responder. Un recorrido resumido no puede convertirse en la pérdida de la mayoría del deck original.

Think se concibió para marketing, tools y lead magnets. Administrar esta nueva experiencia en Greenhouse y exhibirla en Think fue una recomendación inicial reemplazada por una plataforma propia. Trumpet sirve de referencia de espacios compartidos y apoyo al comprador; Insights aporta el patrón de presentación y X-Ray el de demostración contextual. Ninguno define por sí solo la experiencia de Rooms.

## Decisions and authority

| Decisión | Estado y evidencia |
|---|---|
| D1. Plataforma propia con autoría, backend/API y exhibición | Accepted en ADR previo; operador: «Bien, sigamos tu recomendación» |
| D2. Nombre Efeonce Rooms y subdominio `rooms.efeonce.org` | Accepted; operador: «Bien, queda ese nombre» |
| D3. Experiencia comercial y conversión como propósito principal; captación personalizada como uso secundario | Dirección acordada en conversación; no implica garantía de ventas |
| D4. Full API parity UI/CLI/MCP | Requisito explícito del operador, mantenido en este diseño |
| D5. Stack, topología, modelo detallado, políticas propuestas y secuencia | Proposed en este ADR y documentos asociados, para el go final |
| D6. Design system de Rooms: La órbita (`efeonce-graphic-line`) | Accepted 2026-10-07 por corrección explícita del operador; estética, tipografía, componentes, iconografía y motion, también en autoría/consola. AXIS lo distribuye. Composición específica y QA visual siguen pendientes |
| D7. Rooms sirve a propuestas creativas y SEO/AEO, combinables en una sala | Accepted 2026-10-07 por aclaración explícita del operador; creatividad es el primer recorrido, no el límite del producto. Contratos especializados Proposed |

La solicitud actual autoriza redactar y explicar este dossier. No es el go final para construir, migrar, provisionar, desplegar o compartir una propuesta con un cliente.

## Decision proposed

Rooms se construye alrededor de una **sala comercial**, con una o más experiencias versionadas para una oportunidad. Tres trabajos integrados: preparar, demostrar y facilitar la evaluación. El primer recorrido que se materializa es la prueba creativa inmersiva; el alcance V1 incluye también SEO/AEO como perfil de primera clase, y salas que combinan ambos. Los [perfiles de experiencia](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) definen sus bloques, evidencia y aceptación compartida.

El equipo Efeonce opera la plataforma. El comprador obtiene una sala acotada; el champion añade capacidades de preparación/presentación autorizadas. El mismo contenido se puede explorar libremente, seguir como relato o presentar en pantalla limpia. Una biblioteca completa permanece accesible junto a recorridos selectivos.

El design system decidido es **La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md): Bricolage editorial y Poppins para lectura/controles; tokens, componentes, iconografía y motion canónicos distribuidos por AXIS. Sustituye la base Poppins/Geist anteriormente propuesta. Las piezas del cliente conservan su identidad. La voz pregunta/respuesta no se impone al relato.

La composición recomendada dentro de ese sistema es **escenario editorial**: una pieza o argumento dominante, profundidad por interacción, contenido de cliente protagonista y controles precisos. El impacto deriva de composición, escala, ritmo, medios fieles y continuidad. La escenografía 3D permanente, la navegación como paseo virtual y los efectos genéricos quedan descartados para V1.

## Ecosystem ownership

| Plataforma | Rol | Contrato de integración |
|---|---|---|
| Studio | Planificar, producir y activar marketing que genera demanda | Aporta versiones autorizadas de piezas y contexto; sus campañas permanecen allí |
| Think | Atraer y educar mediante contenido/tools/lead magnets | Puede originar una conversación; no aloja el nuevo runtime |
| Rooms | Demostrar valor y acompañar evaluación/conversión | Posee salas, relato, ediciones, recorridos, acceso y conversaciones propias |
| HubSpot | Empresas, personas, deals y etapas comerciales | Rooms enlaza/sincroniza datos acordados, sin pipeline paralelo |
| Greenhouse | Coordinación transversal y operación de la relación | Recibe proyecciones y handoff explícito; no es el editor de Rooms |
| Insights | Elaborar y entregar informes | Rooms referencia una edición/export autorizado; no absorbe todo el producto |
| Proposal Studio / CPQ | Expediente y oferta formal/económica existentes | Documentos enlazados; publicación de una sala no implica presentar una licitación ni aprobar precios |
| Efeonce ID / MCP / AXIS | Identidad, transporte para agentes y distribución técnica de La órbita | `efeonce-graphic-line` gobierna el diseño; AXIS distribuye sus contratos/assets/componentes; permisos y datos Rooms tienen dueño propio |

## Alternatives considered

| Alternativa | Decisión |
|---|---|
| Greenhouse + Think | Descartada para Rooms por fragmentación del ciclo y propósito |
| Nuevo nombre sobre editor alojado dentro de Greenhouse | Insuficiente para la independencia acordada |
| Adoptar Trumpet | Referencia, sin compra decidida; no se verificó paridad integral ni experiencia creativa especializada |
| App propia modular + procesamiento asíncrono | Recomendada por ownership y experiencia integral con operación acotada |
| Motor 3D/WebGL obligatorio y salas físicamente navegables | Descartado de V1: no es necesario para ver/entender/presentar; aumenta coste, accesibilidad y fragilidad |
| CRM, CPQ, firma, outreach masivo y billing SaaS completos | Diferidos: responsabilidades existentes o hipótesis posteriores |

## Runtime contract proposed

- App React/Next.js/TypeScript con backend modular propio, contratos canónicos y una API versionada. La UI nunca es el único canal de un command.
- PostgreSQL y storage privados con ownership Rooms. Servicios compartidos solo mediante contratos, no tablas/sesiones/secretos ajenos.
- Edición inmutable de contenido y medios; conversación mutable con referencias a esa edición. Cambios visibles requieren una edición nueva.
- Grants por sala/edición/acción; notas privadas separadas de proyecciones de audiencia. Modo presentación no amplía permisos.
- Jobs durables para procesamiento; reproducción y consulta no dependen de que HubSpot responda en ese momento.
- Las métricas registran actividad observable, no intención inferida como hecho ni atribución causal de ventas.
- No se migran rutas, datos o grants de productos existentes como efecto de este ADR.

## Consequences

Beneficios: recorrido completo, autonomía del champion, inventario íntegro, diferencias creativas demostrables y reuso entre servicios. Costos: una aplicación adicional, manejo audiovisual, acceso externo, integraciones y operación. Riesgos principales: degradar piezas al adaptarlas, exponer notas, confundir edición con conversación o añadir demasiado alcance antes de demostrar valor.

El nombre está decidido; el logo quedó aceptado el 2026-10-08 ([ADR de marca](EFEONCE_ROOMS_MARK_DECISION_V1.md), `rooms-*` en AXIS). El host es destino acordado, no evidencia DNS/TLS/servicio activo. La futura venta del software a terceros no está decidida.

## Acceptance and revisit

La aceptación documental del operador precede al build. La aceptación del producto exige inventario reconciliado, carga por tres canales, material multiformato, dos marcas con perfil creativo y SEO/AEO más recorrido combinado, acceso aislado, una presentación conducida por champion y QA desktop/móvil/motion reducido. No se sustituye por lint o un video promocional.

Reabrir si se requiere código por cliente, la UI aventaja en capacidades a CLI/MCP, el comprador depende de soporte para presentar, costes medidos exceden el valor o una integración fuerza ownership duplicado.

## Sources

- [Frontera aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md).
- [Ecosistema](../../context/03_ecosistema-producto.md), [experiencia de cliente](../../context/10_experiencia-cliente.md).
- [API parity](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md), [identidad contextual](../EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md), [MCP gateway](../EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md).
- [AXIS portable](../EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md), [norma de marca](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).

## Addendum 2026-10-07 — dos perfiles comerciales de primera clase

El operador aclara: «rooms debe servir para las dos», producción creativa y SEO/AEO. Esta decisión amplía el alcance explícito de producto; el diseño anterior trataba X-ray solo como referencia y centraba la aceptación en medios creativos. El núcleo es la demostración comercial, con bloques y renderers especializados por servicio. No se adopta una galería creativa con PDFs SEO adjuntos ni dos plataformas independientes. [Contrato de perfiles](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md): continuidad nativa de X-ray, evidencia versionada, lectura editorial, radiografía, plan/medición y sala combinada. Se conserva el stack candidato; cambia el modelo de contenido y la certificación de EPIC-052. Construcción y migración de experiencias existentes siguen pendientes.

## Addendum 2026-10-07 — versiones actuales con compatibilidad comprobada

El operador solicita el último Next.js, ESLint, TypeScript, Tailwind y herramientas asociadas, y documentar la viabilidad. Se registra como requisito de selección **últimas versiones estables compatibles**, con pins y actualizaciones verificadas, sin heredar versiones de Greenhouse. La [política y baseline](EFEONCE_ROOMS_STACK_BASELINE_V1.md) conserva fuentes, límites y pruebas de R01. La matriz fechada es candidata: convivencia TS7/TS6, configuración ESLint10 o fallback temporal 9.39.5 y Node24 LTS deben concretarse con evidencia. Documentar este requisito no acepta por inferencia la configuración pendiente ni autoriza implementación, instalación o rollout. Reabrir ante nuevas versiones, cambio de soporte upstream/hosting o regresión del consumidor AXIS.

## Addendum 2026-10-12 — Rooms como destino futuro de la interfaz de Commercial (diferido, sin go)

El operador decidió desacoplar Greenhouse por dominios de producto: [decisión](../GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md), ejecutada por [`EPIC-054`](../../epics/to-do/EPIC-054-greenhouse-product-domain-decoupling.md). Dentro de ese plan declaró su intención para Commercial: **la API se queda en Greenhouse y la interfaz pasaría a Rooms** — Sample Sprints, Cotizaciones, Contratos, Productos, MSA y SOW, y Pipeline. Su razón es de pertenencia: lo comercial vive con la experiencia de venta. El mismo día lo dejó **para después, no ahora**; no tiene fecha, task ni go, y no forma parte de `EPIC-054`.

Qué significa para este ADR:

- **El alcance de V1 no cambia.** R01–R15 siguen siendo la sala, la experiencia del comprador y del champion. Nada de esto es prerrequisito ni entregable del piloto.
- **Hoy este ADR dice lo contrario** y por eso habrá que enmendarlo antes de ejecutar: la fila «CRM, CPQ, firma… Diferidos» de las alternativas, el rol de Proposal Studio / CPQ («documentos enlazados; publicar una sala no aprueba precios») y el de HubSpot («sin pipeline paralelo»). Una interfaz de Pipeline en Rooms sería una vista sobre el dueño del dato, no un segundo pipeline.
- **La regla de frontera se conserva**: Rooms consumiría la API de Commercial por contrato versionado, con sus grants; nunca tablas, sesiones ni secretos de Greenhouse.
- **Es otro usuario.** La autoría comercial es de vendedor y finanzas, internos; la sala es del comprador y su comité, externos. Si ambas viven en Rooms, sus accesos y proyecciones se separan desde el contrato, no en la pantalla.
- **Cotizador V3**: su interfaz es la última fase de `EPIC-053` y sigue sin hogar decidido (portal o Rooms). Como aún no existe, no hay nada que migrar: nace donde se decida.

Efectos del mismo plan que sí tocan a Rooms, sin cambiar su diseño: el motor del Artifact Composer pasa a ser un paquete versionado distribuido por AXIS, e Insights pasa a dominio propio. Rooms los sigue consumiendo como ya estaba previsto, por paquete y por referencia a una edición autorizada.


## Addendum 2026-10-25 — arranque autorizado y autorización por capacidad

Julio autoriza construir la primera entrega: foundation ejecutable seguida de primera experiencia desktop/móvil para revisión. Tasks TASK-2058 y TASK-2059; runtime propio en ../efeonce-rooms, documentación en Greenhouse. Añade expresamente permisos can, jerarquías y vistas cliente/operador/administrador; y autoriza subagentes. Este go acepta la implementación local acotada, no acredita aceptación visual, despliegue, invitaciones o integración real.

La política can(principal, capability, resource) deniega por defecto. Los roles fijan techo de capacidades; cada grant intersecta organización, sala y edición con vigencia/revocación. Administrador incluye capacidades de operador dentro de su ámbito, nunca bypass de tenant. Un principal externo no adquiere funciones internas por cambiar rol. Los DTO de cliente excluyen notas y grants internos por construcción. Las personas de demostración son sintéticas y no constituyen una sesión real. La integración Efeonce ID posterior resuelve autoridad en servidor; jamás se acepta rol u organización del navegador como autoridad.

## Delta 2026-10-25 — continuidad autorizada y persistencia local

El operador fija /goal: seguir con lo pendiente de EPIC-052, con View Transitions modernas y controles La órbita/AXIS desde el inicio. Se autoriza implementación local progresiva; no equivale a aceptación visual definitiva ni despliegue. TASK-2059 conserva UI; TASK-2060 posee ciclo durable de salas.

Decisión local: PostgreSQL18.6 en cluster exclusivo loopback55432, schema rooms y roles propios; pg8.23.1/node-pg-migrate9.0.0. El runtime Rooms crea su único pool server-only; la prohibición de pools paralelos Greenhouse no obliga a importar el runtime Greenhouse en otro producto. Migraciones se generan con CLI del runtime. No se usan credenciales/tablas de otro producto ni se despierta infraestructura hibernada.

Rooms conserva su autoridad de grants, leída de DB en la transacción; principal autenticado deberá derivar de Efeonce ID. La prueba local usa harness explícito con datos sintéticos, nunca bypass en API real. Commands create/updateDraft/publish/reopen/archive y grant/revoke comparten expectedRevision, idempotencia, audit/outbox y locks ordenados. Publicación fija snapshot inmutable. Se añaden capabilities rooms.create y editions.reopen con scope explícito; rol nunca bypass. Estado operativo y limitaciones se prueban antes de ampliar a contenido real, identidad federada, medios o rollout.

## Architecture Decision 2026-10-25 — contenido versionado para autoría

- Status: implementación autorizada por el goal vigente de EPIC-052; alcance TASK-2062, sin activar identidad ni datos cloud.
- Owner: Rooms Platform; Product consume el contrato en una unidad UI posterior.
- Scope: dominio Content, persistencia y proyecciones Rooms; sin mover datos de otros productos.
- Reversibility: aditiva por versión; rollback conserva snapshots publicados y exige reader de ambas versiones.
- Confidence: alta para el problema observado y compatibilidad; readiness de medios depende de R05.
- Validated as of: 2026-10-25, runtime `bd4b802` inspeccionado.

### Context

El corte inicial `rooms.room.v1` exige creative/editorial/plan y piezas ligadas a tres artes sintéticas. Un editor sobre ese contrato obligaría a inventar contenido para guardar. `publish` valida estructura, pero no puede demostrar integridad/ownership/ready de archivos privados que todavía no existen. La aceptación de EPIC-052 requiere perfiles independientes y combinables, inventario íntegro y trazabilidad.

### Decision

Añadir manifest de contenido v2 y separar validez estructural de readiness para publicar. Un borrador incompleto se guarda con IDs/revisión estables; la validación devuelve coverage por elemento y razones accionables. Bloques tipados/versionados y relaciones son datos del mismo agregado Rooms; no nace un segundo CMS ni una copia de autoridad. La publicación fija snapshot validado y coverage con versiones exactas.

El contrato de AssetVersion sólo referencia identidad/versiones. El cliente no puede afirmar `ready`, ownership ni URLs de entrega. El store resolverá recursos de la misma organización/sala; referencias sin registro verificado bloquean publicación. El worker/upload R05 será dueño de registrar bytes/derivados, no esta unidad de Content.

V1 permanece legible y sus snapshots no se migran ni reescriben. La adopción v2 en borrador es explícita; importar nunca convierte automáticamente hipótesis en observaciones ni contenido sintético en real. Tipos no soportados, referencias rotas y exclusiones sin razón producen findings visibles; no se descartan silenciosamente para lograr un import o publicación exitosos.

### Alternatives Considered

- Añadir más campos opcionales a v1: rechazado; confunde compatibilidad de la muestra con composición extensible y mantiene los tres artes como dominio.
- Crear editor con almacenamiento sólo en navegador: rechazado como sustituto de autoría durable; no satisface revisión, paridad ni publicación.
- Reescribir snapshots v1 a v2: rechazado; modifica historia ya publicada y su contrato de render.
- Esperar Efeonce ID para todo Content: rechazado; se puede verificar el dominio y sus transportes en harness con autoridad persistida, manteniendo la API desplegada cerrada.

### Runtime Contract

Commands/readers canónicos, expectedRevision e idempotencia de TASK-2060. Auditoría/outbox en la misma transacción. API/CLI consumen el mismo primitive; MCP sigue pendiente de su integración gobernada. Capability content.edit para autoría; editions.publish separada. Validación y publicación vuelven a comprobar referencias dentro de la transacción, sin confiar en un resultado de preview del cliente. Guardar por rooms.updateDraft tampoco evade estas reglas.

### Consequences and Revisit

La UI consumidora debe elegir renderer por versión; no convertir v2 a una muestra v1 perdiendo bloques. Esta unidad no completa editor, multimedia, escenarios/tours ni R03/R05 por inferencia. Reabrir la decisión si se requieren imports ejecutables, un nuevo source of truth, transferencia entre tenants o modificación de snapshots existentes.


## Architecture Decision 2026-10-25 — sesión guest por invitación

Decisión de implementación bajo el flujo aprobado por Julio (correo único con enlace+código), en conjunto
con ADR `EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`. TASK-2066 implementa autoridad guest local derivada
de invitación/version/session vigentes. No crea profiles/source-links/memberships globales ni roles en Auth.
Un principal externo virtual, persistido como sesión invitada y releído por loadAuthority, aplica el mismo
can y proyección publicada. El grant previsto vive en la invitación, limitado a rooms.read y evidencia sólo
si se delegó expresamente; revocar invitación o autoridad del invitador invalida sesiones sin tocar grants ajenos.
No se interpreta una prueba OTP como IDtoken OIDC ni se mezclan cookies o permisos internos/guest.

Issuer genera/verifica/envía OTP con Resend gobernado; Rooms sólo transmite el código ingresado y consume
proof ES256 de un uso en transacción. Authority S2S usa endpoint fijo y token servicio dedicado. Token de
invitación256bits se entrega en fragmentoURL, digest para lookup y ciphertext sólo para mailer autorizado.
La alternativa de grants genéricos exigiría crear identidades/memberships por correo; se rechaza. Una cookie
con rol dentro, o aceptar el link como bearer, también se rechazan. Plan2066 fija stores, interfaces, controles
y pruebas antes código. FeatureOFF y prueba local no equivalen a activación ni envío a destinatarios reales.

## Security delta 2026-10-25 — invitaciones, TASK-2066

Status: Accepted para implementación local por instrucción explícita del operador de reforzar el token.
Owner: Rooms Platform; issuer OTP sigue TASK-2067. No amplía acceso ni cambia el correo único aprobado.

- Token opaco de 256 bits CSPRNG, sin IDs/correo/rol codificados. No es una credencial de lectura.
- Nueva emisión/reemisión exige vencimiento como máximo 24 horas desde el reloj DB y dentro de la
  vigencia de los permisos delegados. Es un techo de seguridad, no una extensión automática del grant.
  La sesión interna debe estar vigente para autorizar el comando. El horizonte delegado se calcula con
  principal, membresía y grants persistidos, no con la duración corta de esa sesión; todos se revalidan
  en la misma transacción y en cada lectura invitada. Una sesión vencida no puede emitir ni reemitir.
  No hay invitaciones productivas previas: los registros del harness son sintéticos y no se migran a cloud.
- Cada reemisión rota token/version y deja inelegibles enlaces/transacciones/sesiones anteriores.
  OTP sigue temporal/de un uso; el enlace puede iniciar una nueva verificación mientras siga vigente,
  sin prometer que el enlace sea de un solo uso ni que el correo único sea MFA.
- Cuotas durables por invitación, realm y acción, derivadas por servidor. Los tokens/cookies inexistentes
  no crean filas ni consumen un presupuesto compartido que permita bloquear a todos los invitados.
  Esta decisión reemplaza los presupuestos globales por RP del corte8308077: una entrada anónima podía
  agotarlos. No se toma una cabecera IP arbitraria como identidad confiable.
- Protección de volumen anónimo pertenece al borde: rate limiting por IP confiable/WAF, prueba de
  aislamiento y límites de infraestructura antes de ON. No se considera cubierta por el rate limit OTP.
- UI2068 debe retirar fragmento con history.replaceState antes de analítica/requests, no persistir token
  ni código y no cargar scripts de terceros en entrada. Revisión CSP y correo sin click/open tracking,
  href recibido íntegro, HTTPS y configuración de secretos siguen gates del despliegue coordinado.

El compromiso del buzón expone enlace y código del mismo canal; la criptografía del token no elimina ese
riesgo. No se declara MFA, inmunidad a ataques ni certificación de seguridad por esta revisión de código.
Referencias técnicas: [OWASP tokens](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
y [sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
