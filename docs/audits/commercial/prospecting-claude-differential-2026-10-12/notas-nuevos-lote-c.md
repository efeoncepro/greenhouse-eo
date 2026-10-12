# Notas — lote-c (nuevos)

Leídos para todos los casos: `.claude/skills/efeonce-b2b-prospecting/SKILL.md` y `prospecting-diff/casos/lote-c.md`.
No se abrió `evals/`, `.codex/`, `docs/audits/` ni otros archivos de `prospecting-diff/`.

## 1. Archivos abiertos por caso

**P41 (HOLD sin fecha, Naviera Quilla)**
- `references/motions-and-relationship.md`
- `references/account-cadence.md`
- `references/response-handling.md`
- `references/buying-group-and-access.md`
- `references/contact-quality-and-enrichment.md`
- `templates/response-triage.md`

**P43 (Estudio Ñandú, bajo el piso de ICP)**
- `references/account-research-and-signals.md`
- `references/signal-to-action.md`
- `references/message-and-contextual-proof.md`
- `references/buying-group-and-access.md` (sólo para confirmar que el piso de 2–3 no aplica a una descartada)
- `docs/context/13_icp-buyer-personas-jtbd.md` (líneas 30–74, sección de tamaño)
- `templates/signal-action.md`

**P45 (cambio de empleador, Tomás Arce)**
- `references/contact-quality-and-enrichment.md`
- `references/crm-and-commercial-handoff.md`
- `references/signal-to-action.md`
- `references/buying-group-and-access.md` (rutas de acceso, ruta 5)
- `references/message-and-contextual-proof.md`
- `references/motions-and-relationship.md`
- `.claude/skills/hubspot-as-a-service/references/property-inventory.md`
- `grep` (sin lectura completa) sobre `hubspot-as-a-service/references/prospecting-segmentation.md` y `account-based-prospecting.md` buscando «empleador / Primary Company»
- `templates/signal-action.md`, `templates/action-pack.md`
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`

**P47 (¿está lista la «campaña»?, Clínica Arrayán)**
- `references/deliverability-operations.md`
- `templates/delivery-readiness.md`
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`
- `references/message-and-contextual-proof.md`

Abierto y no usado en ningún caso: `references/situation-entry-playbooks.md` (primeras 40 líneas).

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

**P41**
- `references/account-cadence.md`, fila «Hito comprador o HOLD vigente»: «La investigación offline ya autorizada puede seguir sólo para tener la cobertura lista al levantarse el HOLD» frente a `SKILL.md`: «no es motivo para sumar gente bajo HOLD o negativa» (y lo mismo en `buying-group-and-access.md`). No queda claro si identificar una función que falta (por ejemplo quién decide la inversión) cuenta como «cobertura lista» o como «sumar gente». Lo leí así: se puede investigar y dejar en el dossier; no se agrega a CRM, secuencias ni rutas de contacto.
- Misma fila: «sin créditos ni escrituras CRM nuevas motivadas por el HOLD». La brecha del correo de TI existía antes del HOLD, así que no es evidente si un crédito para completarla está «motivado por el HOLD». El pedido del operador («mientras tanto… completa los correos») sí lo ata a la espera; recomendé diferirlo, pero la frase admite la lectura contraria.
- `references/response-handling.md`: «Un acuse breve al mismo interlocutor lo decide Commercial». Cuando el operador es Julio no queda claro si «Commercial» es él mismo u otro owner; escribí «quien lleva el Deal».
- `references/response-handling.md`, fila sin fecha: «Revisión interna documentada, no autorización para enviar» no dice cada cuánto ni quién la fija; dejé la revisión sujeta al aviso de la compradora, sin fecha.

**P43**
- `SKILL.md`: «En una candidata fuera de ICP, entrega descarte/evidencia antes de invertir en contactos o preventa». No dice si un borrador pedido expresamente por el operador es «preventa» que se retiene, o si se entrega condicionado. Opté por no redactarlo y decir qué lo habilitaría.
- `references/account-research-and-signals.md`: la única excepción descrita es «una filial de grupo mediano/grande con excepción previamente documentada por el operador». No define si el operador puede declarar una excepción para una empresa independiente bajo el piso, ni qué debe documentar. Asumí que sí puede y que es decisión suya.
- La alternativa «nota personal sin oferta» no está ni permitida ni prohibida en ningún módulo; la mencioné en una línea como algo fuera de prospección.

**P45**
- `references/crm-and-commercial-handoff.md`: «anotar el cambio como pendiente con fuente y fecha». No indica dónde (nota de Contact, propiedad, dossier) ni si esa anotación es una escritura que necesita confirmación propia. La traté como nota de Contact a confirmar.
- Mismo párrafo y `contact-quality-and-enrichment.md`: nada dice qué hacer con `jobtitle` cuando el cargo nuevo es desconocido; lo dejé «pendiente».
- `references/crm-and-commercial-handoff.md`: «sin usar el correo anterior para contactar» frente a `signal-to-action.md`: «preparar reencuentro pertinente si está permitido» y `templates/action-pack.md`: «Sin permiso de contacto, entregar borrador». No queda claro si se entrega un borrador cuando no existe ningún destinatario válido. Lo entregué marcado como no enviable.
- `references/buying-group-and-access.md`, ruta 5 («alguien que conoce»): los hechos no dicen con quién fueron las reuniones de 2025, y la skill mide la relación «por persona y con quién». Propuse el mensaje manual condicionado a que hayan sido con Julio.
- `SKILL.md`: «busca 2–3 contactos adicionales relevantes, incluso si el objetivo tiene correo». Para un pedido focalizado en una persona que cambió de empresa no es evidente si el piso aplica a la cuenta nueva; no lo apliqué (seguí «Responde lo pedido, en su tamaño»).

**P47**
- `templates/delivery-readiness.md`, línea de decisión de opción única («no listo: defecto conocido corregible / pendiente de chequeo / …»): en el caso conviven dos estados, defecto corregible (firma, CCO) y envío no autorizado. La plantilla no dice cómo expresar ambos; di el veredicto por el defecto y listé la autorización como pendiente.
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`: «"envíalo" después de revisar el texto ya es autorización» frente al hecho del caso («el envío no está autorizado») y al pedido («la quiero mandar mañana»). No queda claro si esa intención del operador cuenta como autorización; la traté como no dada.
- `references/deliverability-operations.md`: «el literal, sólo cuando el operador lo necesita para corregir o preparar ese envío». En un pedido de diagnóstico no es obvio si incluir el literal del CCO y el texto de la firma; los incluí porque los necesita para corregir.
- `references/deliverability-operations.md`: «Si la acción depende de una condición mutable, revalidarla antes de ejecutarla» (en `signal-to-action.md`) no fija cuánto dura una consulta de supresión/opt-out; usé «si se corre más allá de mañana».

**General**
- `SKILL.md` pide a la vez respuestas proporcionales («Lo que verificaste y no cambia el siguiente paso se omite») y que «cada paso de cadencia» lleve «persona/canal, motivo, owner y condición de parada». En P41 resumí owner y condición de parada en prosa en lugar de columnas.
