# Notas — lote-a (con skill)

Rutas relativas a `/Users/jreye/Documents/greenhouse-eo/`. `S/` = `.claude/skills/efeonce-b2b-prospecting/`, `H/` = `.claude/skills/hubspot-as-a-service/`.

Aclaración de método: leí los módulos en tres tandas antes de redactar, no caso por caso. La lista por caso indica qué archivos sostienen cada respuesta. Leídos para todos: `S/SKILL.md` y el archivo de casos `prospecting-diff/casos/lote-a.md`.

## 1. Archivos abiertos por caso

### P01
- `S/SKILL.md`
- `S/references/account-research-and-signals.md`
- `S/references/signal-to-action.md`
- `S/references/buying-group-and-access.md`
- `S/references/contact-quality-and-enrichment.md`
- `S/references/crm-and-commercial-handoff.md`
- `S/references/motions-and-relationship.md`
- `S/references/message-and-contextual-proof.md`
- `S/references/situation-entry-playbooks.md` (sección 3, canal/activación física)
- `S/templates/account-brief.md`, `S/templates/action-pack.md`, `S/templates/signal-action.md`
- `H/references/property-inventory.md`
- `H/references/prospecting-segmentation.md`
- `H/references/account-based-prospecting.md` (el `cat` de este archivo quedó cortado por un error de shell tras `property-inventory.md`; no lo releí, así que en la práctica NO llegué a leerlo)
- `H/templates/account-based-changeset.md`
- `docs/architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md` (sólo encabezados vía `grep`; no leí el cuerpo)

### P07
- `S/SKILL.md`
- `S/references/motions-and-relationship.md`
- `S/references/account-cadence.md`
- `S/references/response-handling.md`
- `S/references/buying-group-and-access.md`
- `S/templates/account-cadence.md`, `S/templates/response-triage.md`

### P13
- `S/SKILL.md`
- `S/references/buying-group-and-access.md`
- `S/references/discovery-and-proof.md`
- `S/references/crm-and-commercial-handoff.md`
- `S/references/situation-entry-playbooks.md` (sección 4, transformación CRM/RevOps)
- `S/references/account-cadence.md`
- `S/templates/decision-proof.md`, `S/templates/action-pack.md`, `S/templates/account-brief.md`

### P20
- `S/SKILL.md`
- `S/references/buying-group-and-access.md`
- `S/references/motions-and-relationship.md`
- `S/references/message-and-contextual-proof.md`
- `S/references/account-cadence.md`
- `S/references/signal-to-action.md`
- `S/references/contact-quality-and-enrichment.md`
- `S/templates/account-brief.md`

### P34
- `S/SKILL.md`
- `S/references/response-handling.md`
- `S/references/deliverability-operations.md`
- `S/references/account-cadence.md`
- `S/references/motions-and-relationship.md`
- `S/templates/response-triage.md`, `S/templates/delivery-readiness.md`

### No abiertos (a propósito o por no hacer falta)
- `S/evals/**` y todo `docs/audits/**` (prohibidos por la tarea).
- `S/references/abm-and-abs.md`, `capacity-and-economics.md`, `experiments-and-learning.md`, `sources.md`; `S/templates/account-economics.md`, `account-learning.md`, `situation-entry.md`.
- Skills dueñas enlazadas (Customer Model, Commercial, Copywriting, Business Model, HubSpot SKILL.md), `docs/context/13_icp-buyer-personas-jtbd.md`, `docs/manual-de-uso/hubspot/llenar-propiedades-comerciales.md`, política Outlook, `docs/services/channel-commerce/README.md`.

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

1. **Granularidad de una autorización de CRM (P01).** `S/SKILL.md`: «Investigación, créditos, CRM, Deals, enrollment, publicación y envío tienen autoridad separada» y «Reutiliza aprobaciones explícitas dentro de su alcance»; `S/references/crm-and-commercial-handoff.md`: «objetivo sin correo queda en investigación o nota de Company autorizada». El operador autorizó «registrar los contactos que cumplan nuestros criterios». La skill no dice si esa autorización cubre crear/reutilizar la Company a la que hay que asociarlos, ni la nota de Company con la solicitud del autor. Resolví: Company = dependencia implícita del alta; nota = escritura aparte que pide confirmación. Es una lectura mía, no una regla escrita.

2. **Capacidad de entrega no acreditada vs «fuera de ICP» (P01).** `S/SKILL.md`: «En una candidata fuera de ICP, entrega descarte/evidencia antes de invertir en contactos o preventa». `S/references/account-research-and-signals.md`: «No prometer operación Coljuegos en Colombia por encontrar una señal». No queda claro si una cuenta que cumple tamaño pero cuya necesidad cae en un mercado/capacidad no acreditada (línea de canal con «Mercado inicial Chile» en el ADR) cuenta como «fuera de ICP» —y entonces el registro de contactos debería esperar al descarte— o si sólo condiciona la oferta. Opté por lo segundo: registrar elegibles y bloquear la oferta.

3. **Ruta hacia un autor sin correo que publicó en un canal público (P01).** `S/references/signal-to-action.md` (fila de búsqueda explícita): «Responder al alcance pedido o preparar consulta admisible»; `S/references/buying-group-and-access.md`: «Puede haber ruta autorizada de introducción/canal oficial sin correo directo»; `S/references/message-and-contextual-proof.md`: «No automatizar scraping, invitaciones o DMs por defecto». No se define si responder a mano en la misma red donde se publicó (comentario/mensaje) es un «canal oficial» admisible ni qué autoridad lo cubre (¿«envío»? ¿otra?). Lo dejé como ruta principal condicionada a leer la publicación y a permiso de contacto.

4. **Qué fecha escribir en `efeonce_prospecting_researched_on` (P01).** `H/references/prospecting-segmentation.md`: «Every intake or re-research now writes `efeonce_prospecting_researched_on`» y «The date holds the latest research only». No distingue fecha de corte de la evidencia (2026-10-11) de fecha de escritura (posterior). Usé la de corte.

5. **`efeonce_prospecting_service_fit` sin valor compatible (P01).** `H/references/prospecting-segmentation.md` lista sólo `creative` y `hubspot_crm` («Verified portal dictionary (2026-10-06; revalidate before use)»), y `H/references/property-inventory.md` remite a «las filas necesarias del inventario fechado» que vive en `docs/audits/commercial/hubspot-properties-2026-10-11/README.md`. Esa carpeta estaba vedada en esta tarea, así que no pude comprobar si el enum cambió; dejé el campo vacío. Misma limitación con el enlace de `buying-group-and-access.md` a `docs/audits/commercial/2026-10-11-buying-group-coverage-research.md`. Observación general: dos módulos operativos dependen de `docs/audits/**` para aplicarse por completo.

6. **Regla «siempre 2–3 adicionales» frente a un HOLD (P07).** `S/SKILL.md`: «siempre busca inicialmente 2–3 contactos adicionales relevantes… Amplía según los roles, decisiones y riesgos»; `S/references/account-cadence.md` (fila HOLD): «Retener acciones incompatibles… No reemplazar al interlocutor para acelerar el proceso». La skill no dice si *investigar* más personas (sin contactarlas) durante un HOLD es una «acción incompatible». Lo resolví por la intención del pedido («para acelerar») y porque la base ya estaba cubierta, pero un pedido de pura investigación bajo HOLD quedaría sin respuesta clara.

7. **Aclaración al mismo interlocutor bajo HOLD sin fecha (P07).** `S/references/response-handling.md` (fila «Más adelante, sin fecha»): «una aclaración breve puede proponer evento o permiso de seguimiento si no cerró la conversación». El mensaje del caso es «esperen, no avancen hasta que confirme aprobación»: no encaja limpio ni en «más adelante con evento concreto» (hay evento, sin fecha) ni en «sin fecha». Difícil decidir si un acuse breve es compatible con «no avancen». Lo ofrecí como borrador opcional sujeto a Commercial.

8. **Doble sentido de «aprobación» (P13).** La skill usa el término para la autorización del operador (`S/SKILL.md`: «Reutiliza aprobaciones explícitas») y para la fase del comprador (`S/references/buying-group-and-access.md`, fila «Propuesta / aprobación»). El pedido «preparar aprobación» admite ambas lecturas y nada en la skill indica cuál asumir; respondí las dos.

9. **Restricción de alcance empresa-iniciativa que no es ni rechazo ni baja (P34, Este).** `S/references/response-handling.md` separa «Rechazo explícito / no me interesa» y «Baja / no me contacten / unsubscribe». «No contacten a nadie más de nuestra empresa por esto» no dice nada sobre el propio emisor. `S/references/motions-and-relationship.md`: «Una exclusión ambigua queda para aclaración, sin ampliar ni reducir su alcance automáticamente» — pero aclarar exige escribirle a quien puso la restricción, y la skill no dice si ese mensaje de aclaración está permitido ni quién lo decide (sólo: «No enviar mensaje de despedida salvo que esté justificado y permitido»).

10. **Lectura de un código SMTP sin reporte (P34, Sur).** `S/references/deliverability-operations.md` sólo nombra `5.7.515` y advierte no «tratar cualquier NDR de Microsoft 365 como ese diagnóstico»; su tabla de rebotes parte de evidencia ya diagnosticada. Para «5.7.1 sin reporte completo» tuve que usar conocimiento general de la familia 5.7.x y marcarlo como hipótesis. Además hay dos tablas que se solapan para el mismo evento: `response-handling.md` («Bounce permanente / identidad cuestionada» vs «Error transitorio») y `deliverability-operations.md` («Hard bounce sin diagnóstico, filtro, autenticación o bloqueo de política»); un 5.7.1 es permanente por clase pero de política por causa, y sólo la segunda tabla lo trata bien.

11. **Margen tras el retorno de un OOO (P34, Oeste).** `S/references/response-handling.md`: «Revisar tras retorno/contexto». No da criterio sobre cuánto después ni si la revisión interna puede fijarse el mismo día del retorno. Puse el día siguiente (20/10) por criterio propio.

12. **Límite de acciones de una cadencia fría (P20).** `S/references/account-cadence.md`: «Elegir intervalo y número máximo de acciones para este caso» y `S/references/message-and-contextual-proof.md`: «No imponer seis toques…». No hay punto de partida, así que «apertura + un seguimiento como máximo» es juicio mío sin respaldo explícito. No es contradicción; es difícil de aplicar de forma consistente entre operadores.

13. **Limitación de mi lectura, no de la skill.** `H/references/account-based-prospecting.md` figura en la tabla de recorridos del `SKILL.md` («Representar cuentas objetivo y roles en HubSpot») y no llegué a leerlo por el error de shell indicado arriba. El changeset de P01 se apoyó en `property-inventory.md`, `prospecting-segmentation.md` y la plantilla de changeset.
