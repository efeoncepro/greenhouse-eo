# Notas — con skill — lote-b

Rutas relativas a `/Users/jreye/Documents/greenhouse-eo/`. Prefijo `SK/` = `.claude/skills/efeonce-b2b-prospecting/`.
No abrí `evals/`, nada bajo `docs/audits/`, ni otras carpetas de `prospecting-diff/` fuera de `casos/lote-b.md`.
No abrí las skills hermanas completas (Customer Model, Commercial, Copywriting, Business Model, HubSpot SKILL.md); sólo los documentos listados.

## 1. Archivos abiertos por caso

Comunes a los cinco: `SK/SKILL.md`, `casos/lote-b.md`.

### P03
- `SK/references/motions-and-relationship.md`
- `SK/references/contact-quality-and-enrichment.md`
- `SK/references/buying-group-and-access.md`
- `SK/references/signal-to-action.md`
- `SK/references/crm-and-commercial-handoff.md`
- `SK/references/message-and-contextual-proof.md`
- `SK/references/account-research-and-signals.md` (piso de tamaño)
- `SK/templates/signal-action.md`, `SK/templates/account-brief.md`, `SK/templates/action-pack.md`
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md` (firma/CCO para el envío futuro)

### P09
- `SK/references/account-research-and-signals.md`
- `SK/references/signal-to-action.md`
- `SK/references/situation-entry-playbooks.md`
- `SK/references/buying-group-and-access.md` (regla de recruiter / formulario laboral)
- `SK/references/contact-quality-and-enrichment.md` (buzón general)
- `SK/templates/situation-entry.md`, `SK/templates/signal-action.md`
- `docs/context/13_icp-buyer-personas-jtbd.md` (sólo líneas 30–69 + un grep de términos de tamaño)

### P18
- `SK/references/buying-group-and-access.md`
- `SK/references/contact-quality-and-enrichment.md`
- `SK/references/crm-and-commercial-handoff.md`
- `SK/references/message-and-contextual-proof.md` (texto reenviable)
- `.claude/skills/hubspot-as-a-service/references/account-based-prospecting.md`
- `.claude/skills/hubspot-as-a-service/references/prospecting-segmentation.md`
- `SK/templates/action-pack.md`, `SK/templates/account-brief.md`
- No abrí `property-inventory.md` ni la plantilla `account-based-changeset.md`: el pedido era offline y sin lectura del portal, así que dejé el plan de captura a nivel de campos ya citados en la segmentación.

### P28
- `SK/references/capacity-and-economics.md`
- `SK/templates/account-economics.md`

### P39
- `SK/references/deliverability-operations.md`
- `SK/templates/delivery-readiness.md`
- `SK/references/contact-quality-and-enrichment.md`
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`
- `.claude/skills/hubspot-as-a-service/references/prospecting-segmentation.md` (sección de preparación de email: supresión antes de envío)

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

1. **«Siempre» vs. cuenta fuera de ICP (P09).** `SK/SKILL.md`: «**siempre busca inicialmente 2–3 contactos adicionales relevantes**». Más abajo, mismo archivo: «En una candidata fuera de ICP, entrega descarte/evidencia antes de invertir en contactos o preventa; el gate de acceso aplica a cuentas en investigación comercial». La segunda frase resuelve el conflicto, pero el «siempre» en negrita de la primera lo contradice en la lectura literal. Apliqué la segunda.

2. **Borrador pedido explícitamente para una cuenta descartada (P09).** El operador pidió «investigación/borrador». `SK/references/situation-entry-playbooks.md` dice «entregar investigación pendiente o no-fit con razón, sin fabricar una oferta para completar la tabla», pero ninguna frase dice qué hacer cuando el borrador lo pide el operador y la cuenta es no-fit. Decidí no redactarlo y ofrecer hacerlo si declara excepción. Tampoco está escrito cómo debe quedar registrada una excepción nueva: `SK/references/account-research-and-signals.md` sólo habla de «excepción previamente documentada por el operador» para filiales de grupo.

3. **¿Dos adyacentes ya dados cuentan como la base de «2–3»? (P03).** `SK/references/buying-group-and-access.md`: «busca inicialmente **2–3 personas adicionales relevantes**… Son personas extra, no roles en total». Con dos ya en los hechos y sin créditos, no queda claro si la base está cumplida o si falta una tercera búsqueda. La declaré como brecha condicionada a autorización.

4. **Contact existente cuyo correo dejó de ser vigente (P03).** El gate está escrito para altas: `SK/references/contact-quality-and-enrichment.md` «**Admisión de un nuevo Contact/Lead**… Este contrato no borra registros históricos». `SK/references/crm-and-commercial-handoff.md` añade «Dedupe por email no resuelve un cambio de empleador» y «Correcciones de Primary Company requieren evidencia de empleo/entidad y autorización vigente». Ninguna dice qué hacer con el Contact ya existente cuando la persona cambió de empleador y no hay correo nuevo: ¿se reasocia a la nueva Company sin correo vigente (equivale funcionalmente a un Contact sin correo en la nueva cuenta) o se conserva en la antigua? Opté por conservar y anotar, sin mover Primary Company.

5. **Canal personal no-email para el reencuentro (P03).** Las rutas de `SK/references/buying-group-and-access.md` («Acceso directo validado… Introducción real… Acercamiento propio a adyacente… Canal de proceso oficial») no contemplan un mensaje manual del propio Julio por red profesional a alguien que ya conoce. `SK/references/message-and-contextual-proof.md` sólo dice «No automatizar scraping, invitaciones o DMs por defecto», lo que no aclara si un DM manual es una ruta admitida. Lo propuse como ruta principal por ser acceso directo con relación real, enviado por él.

6. **Nota de Company: ¿qué autorización la cubre? (P18).** `SK/SKILL.md`: «conserva la señal en investigación o nota de Company». `SK/references/crm-and-commercial-handoff.md`: «objetivo sin correo queda en investigación o nota de Company autorizada». El caso autoriza sólo «registrar personas que cumplan nuestro gate de correo». No está escrito si una autorización de registro de contactos incluye la nota de Company del stakeholder sin correo. La traté como autoridad separada y la pedí.

7. **Placeholder nativo (P18).** `.claude/skills/hubspot-as-a-service/references/account-based-prospecting.md`: «Stakeholder sin email | Investigación; nota Company autorizada; placeholder nativo sólo con capacidad y acción verificadas». Sin lectura del portal no hay forma de saber si esa capacidad está verificada; la opción queda inaplicable offline y no la mencioné al operador.

8. **Capacidad con continuidad no confirmada (P28).** `SK/references/capacity-and-economics.md` da la fórmula y el ejemplo («caben dos ese período, si los demás owners también tienen disponibilidad») y, aparte, «Definir owner y esfuerzo posterior a la ventana; no abandonar cuentas para cumplir una cuota de nuevas». No indica si la falta de capacidad confirmada en la ventana siguiente reduce el número de entradas o sólo lo condiciona. «sin confirmación, mantener el plan condicionado» está escrito para las horas de la ventana actual. Entregué techo 2 condicionado y alternativa de 1.

9. **Reparto de costo compartido por cuenta (P28).** Mismo archivo: «Exponer qué cubre la tarifa y el criterio de reparto compartido» y «Medir costo por cuenta trabajada». Con una licencia asignada al plan (25%) y un plan que mezcla cuentas nuevas y seguimiento de número desconocido, no hay regla para bajar la licencia a costo por cuenta. Dejé el criterio como faltante y mostré un supuesto etiquetado.

10. **«Reportar gasto y cero resultados» cuando el gasto tampoco se consumió (P28).** Mismo archivo: «Con cero resultados, el costo por resultado no está definido: reportar gasto y cero resultados». En el caso todas las horas son estimaciones no consumidas; la frase no distingue si «gasto» es el estimado, el comprometido o el real. Reporté los tres por separado.

11. **Proporcionalidad «campaña» con un solo contacto (P39).** `SK/references/deliverability-operations.md`: «No exigir un dashboard de reputación inexistente para una respuesta puntual autorizada y sin indicios de problema» frente a «Para una ola, si una brecha impide justificar seguridad/capacidad de ese volumen, dejarla pendiente». El pedido dice «campaña» pero los hechos sólo describen un contacto y ningún volumen. No hay criterio para clasificar el caso intermedio (primer mensaje individual en frío, no «respuesta»). Entregué ambas lecturas.

12. **Etiqueta de decisión de la plantilla (P39).** `SK/templates/delivery-readiness.md`: «Decisión: preparar / listo para acción ya autorizada / pendiente de chequeo / carril bloqueado». Un borrador con defectos conocidos (firma incompleta, sin BCC) no encaja limpio: no es un bloqueo del carril ni una simple falta de evidencia. El módulo define «Bloqueado indica restricción o fallo concreto que impide esa acción», lo que podría abarcar el BCC ausente. Usé «conocido, adverso» en la fila y «no lista / pendiente de chequeo» como decisión.

13. **Alcance de la prohibición de warm-up y otro dominio (P39).** `SK/references/deliverability-operations.md`: «No usar rotación de dominios/remitentes, dominios parecidos, bot warm-up, listas compradas o allowlists **para rodear restricciones**». En el caso no hay restricción conocida que rodear; leída literalmente, la frase no prohíbe un warm-up preventivo ni un dominio adicional sin restricción previa. La otra frase aplicable («No adoptar tasas de bounce, volúmenes por día, número de toques ni warm-up del vendor como defaults») tampoco cubre exactamente un bot de warm-up propuesto en un plan. Lo rechacé igualmente, apoyándome además en «no … autoriza … alta de dominio».

14. **Dirección de BCC en la respuesta.** `SK/references/deliverability-operations.md` escribe el CCO literal (`<CCO de registro>`) mientras `SK/SKILL.md` pide «sin emails reales en ejemplos versionados». Es una dirección de registro, no de una persona, pero la frontera no está dicha. La incluí en P39 porque es el dato que el operador necesita para corregir el borrador.

15. **Enlace a material prohibido en esta tarea.** `SK/references/buying-group-and-access.md` remite a `docs/audits/commercial/2026-10-11-buying-group-coverage-research.md` y la política Outlook a `docs/audits/commercial/2026-10-08-outlook-signature-bcc.md`. No los abrí; ninguna decisión dependió de ellos.
